"""
Time-Series XGBoost Prediction Agent
max_depth=3 captures pairwise and triple-feature interactions that
neither Ridge (linear-only) nor GAM (additive-only) can model.

Why XGBoost over GAM:
  GAM is purely additive: score = f(sleep) + f(stress) + ...
  It cannot represent "low sleep AND high stress together are far worse
  than either alone." XGBoost trees split on one feature, then
  sub-split on another — depth-2 captures all pairwise interactions,
  depth-3 captures triple interactions (e.g. debt + burnout + low income).

Why max_depth=2/3 and not deeper:
  Deeper trees overfit on small datasets (~30-60 rows).
  Depth-3 is enough to capture the most important cross-domain effects
  without memorising the seed arc.

Architecture:
  - One XGBRegressor per target (health, finance, career)
  - 31 input features: 12 current habits + 12 rolling-7d averages
    + 6 lag scores (t-1, t-3) + 1 time trend
  - Deterministic engine scores are the LABELS (y), not inputs
  - At predict time: deterministic base + clamped XGBoost delta
    is computed on the JS side (getMLDashboardScores)
  - Feature importance: gain-based (avg loss reduction per split)

Fallback chain: XGBoost → Ridge → mock
"""

import numpy as np
from typing import Dict, List

# ── Library guards ─────────────────────────────────────────────────────────────

try:
    import xgboost as xgb
    from sklearn.model_selection import cross_val_score
    from sklearn.metrics import r2_score
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score as _cv
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# ── Feature definitions ────────────────────────────────────────────────────────

HABIT_FEATURES = [
    "sleep_hours",      # 3–10   lifestyle
    "stress_level",     # 1–10   lifestyle
    "workout_minutes",  # 0–120  lifestyle
    "study_hours",      # 0–12   lifestyle
    "spending_ratio",   # 0–1    lifestyle
    "mood_score",       # 1–10   lifestyle
    "income_level",     # 0–2    financial state
    "savings_months",   # 0–12   financial state
    "debt_ratio",       # 0–3    financial state
    "burnout_risk",     # 0–10   health state
    "dsa_problems",     # 0–10   career state
    "coding_hours",     # 0–8    career state
]
LIFESTYLE_FEATURES = HABIT_FEATURES[:6]   # shown in Simulator UI
TARGET_NAMES       = ["health_score", "finance_score", "career_score"]

N_HABIT   = len(HABIT_FEATURES)          # 12
N_ROLLING = len(HABIT_FEATURES)          # 12 — 7-day rolling averages
N_LAG     = len(TARGET_NAMES) * 2        # 6  — lag-1 and lag-3 scores
N_TREND   = 1
TOTAL_FEAT = N_HABIT + N_ROLLING + N_LAG + N_TREND   # 31

# XGBoost hyperparameters — tuned for small datasets (30–100 rows)
XGB_PARAMS = dict(
    n_estimators      = 200,
    max_depth         = 3,       # triple-feature interactions
    learning_rate     = 0.05,    # slow LR prevents overfitting on small data
    subsample         = 0.8,     # row subsampling adds variance
    colsample_bytree  = 0.7,     # feature subsampling per tree
    min_child_weight  = 2,       # min samples per leaf — guards against overfitting
    gamma             = 0.1,     # min gain to make a split
    reg_alpha         = 0.1,     # L1 regularisation
    reg_lambda        = 1.5,     # L2 regularisation
    random_state      = 42,
    verbosity         = 0,
    objective         = "reg:squarederror",
)


def _rolling_mean(values: list, window: int) -> list:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(float(np.mean(values[start : i + 1])))
    return result


class PredictionAgent:
    def __init__(self):
        self.models: Dict[str, object]            = {}
        self.scalers: Dict[str, object]           = {}   # Ridge fallback only
        self.trained:            bool             = False
        self.model_type:         str              = "none"
        self.accuracy:           Dict[str, float] = {}
        self.feature_importance: Dict[str, List[float]] = {}
        self._last_scores:       Dict[str, float] = {}
        self._score_trend:       Dict[str, float] = {}

    # ── Feature engineering ───────────────────────────────────────────────────

    def _build_features(self, records: List[dict]):
        """
        31-feature matrix per record (from index 1 onward — lag-1 needs index 0).
        Layout:
          [0:12]  current habit values
          [12:24] 7-day rolling habit averages   ← consistency signal
          [24:27] lag-1 domain scores            ← recent momentum
          [27:30] lag-3 domain scores            ← slower trend
          [30]    normalised time index (0→1)    ← position in arc
        XGBoost can discover interactions across ALL 31 dimensions at depth-3.
        """
        n = len(records)
        habit_series = {f: [float(r.get(f, 0)) for r in records] for f in HABIT_FEATURES}
        score_series = {t: [float(r.get(t, 50)) for r in records] for t in TARGET_NAMES}
        rolling      = {f: _rolling_mean(habit_series[f], 7) for f in HABIT_FEATURES}

        X_rows, y = [], {t: [] for t in TARGET_NAMES}

        for i in range(1, n):
            lag1  = [score_series[t][i - 1]         for t in TARGET_NAMES]
            lag3  = [score_series[t][max(0, i - 3)] for t in TARGET_NAMES]
            trend = i / (n - 1) if n > 1 else 0.5

            row = (
                [habit_series[f][i] for f in HABIT_FEATURES] +
                [rolling[f][i]      for f in HABIT_FEATURES] +
                lag1 + lag3 + [trend]
            )

            if any(np.isnan(v) or np.isinf(v) for v in row):
                continue

            X_rows.append(row)
            for t in TARGET_NAMES:
                y[t].append(score_series[t][i])

        return np.array(X_rows), y

    # ── Training ──────────────────────────────────────────────────────────────

    def train(self, historical_data: List[dict]) -> dict:
        if not XGBOOST_AVAILABLE and not SKLEARN_AVAILABLE:
            return self._mock_train(historical_data)
        if len(historical_data) < 6:
            return {"success": False, "error": "Need at least 6 data points", "trained": False}

        records = sorted(historical_data, key=lambda r: r.get("date", r.get("ds", "")))
        X, y_dict = self._build_features(records)
        if len(X) < 5:
            return {"success": False, "error": "Insufficient valid rows after feature engineering", "trained": False}

        # Store lag context and trend for use at prediction time
        last = records[-1]
        for t in TARGET_NAMES:
            self._last_scores[t] = float(last.get(t, 50))
        tail = records[-5:]
        for t in TARGET_NAMES:
            vals  = [float(r.get(t, 50)) for r in tail]
            diffs = [vals[i] - vals[i - 1] for i in range(1, len(vals))]
            self._score_trend[t] = float(np.mean(diffs)) if diffs else 0.0

        if XGBOOST_AVAILABLE:
            return self._train_xgboost(X, y_dict)
        return self._train_ridge(X, y_dict)

    def _train_xgboost(self, X: np.ndarray, y_dict: dict) -> dict:
        for t in TARGET_NAMES:
            y     = np.array(y_dict[t])
            model = xgb.XGBRegressor(**XGB_PARAMS)

            # Cross-validated R² when we have enough rows; in-sample otherwise
            if len(X) >= 10:
                cv     = min(5, len(X))
                scores = cross_val_score(model, X, y, cv=cv, scoring="r2")
                acc    = float(np.mean(scores))
            else:
                model.fit(X, y)
                acc = float(r2_score(y, model.predict(X)))

            model.fit(X, y)
            self.models[t]    = model
            self.accuracy[t]  = round(max(0.0, min(1.0, acc)), 3)

            # Gain-based importance for lifestyle features only (first 6).
            # "Gain" = average improvement in loss for every split on that feature —
            # more meaningful than split-count for understanding what drives scores.
            booster = model.get_booster()
            scores_map = booster.get_score(importance_type="gain")
            raw = [scores_map.get(f"f{i}", 0.0) for i in range(len(LIFESTYLE_FEATURES))]
            total = sum(raw) or 1.0
            self.feature_importance[t] = [round(v / total, 4) for v in raw]

        self.trained    = True
        self.model_type = "time_series_xgboost"
        return {
            "success":            True,
            "trained":            True,
            "sample_count":       len(X),
            "accuracy":           self.accuracy,
            "feature_names":      LIFESTYLE_FEATURES,
            "feature_importance": self.feature_importance,
            "model":              "time_series_xgboost",
        }

    def _train_ridge(self, X: np.ndarray, y_dict: dict) -> dict:
        """Ridge fallback when xgboost is not installed."""
        for t in TARGET_NAMES:
            y      = np.array(y_dict[t])
            scaler = StandardScaler()
            Xs     = scaler.fit_transform(X)
            model  = Ridge(alpha=1.0)

            if len(X) >= 10:
                cv     = min(5, len(X))
                scores = _cv(model, Xs, y, cv=cv, scoring="r2")
                acc    = float(np.mean(scores))
            else:
                model.fit(Xs, y)
                preds  = model.predict(Xs)
                ss_res = np.sum((y - preds) ** 2)
                ss_tot = np.sum((y - np.mean(y)) ** 2)
                acc    = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

            model.fit(Xs, y)
            self.models[t]   = model
            self.scalers[t]  = scaler
            self.accuracy[t] = round(max(0.0, min(1.0, acc)), 3)

            coefs = np.abs(model.coef_[:len(LIFESTYLE_FEATURES)])
            total = coefs.sum()
            self.feature_importance[t] = (coefs / total).tolist() if total > 0 else \
                [1 / len(LIFESTYLE_FEATURES)] * len(LIFESTYLE_FEATURES)

        self.trained    = True
        self.model_type = "time_series_ridge_fallback"
        return {
            "success":            True,
            "trained":            True,
            "sample_count":       len(X),
            "accuracy":           self.accuracy,
            "feature_names":      LIFESTYLE_FEATURES,
            "feature_importance": self.feature_importance,
            "model":              "time_series_ridge_fallback",
        }

    # ── Prediction ────────────────────────────────────────────────────────────

    def predict(self, params: dict) -> dict:
        if not self.trained:
            return self._mock_predict(params)

        row = (
            [float(params.get(f, 0)) for f in HABIT_FEATURES] +
            [float(params.get(f, 0)) for f in HABIT_FEATURES] +   # rolling ≈ sustained
            [self._last_scores.get(t, 50) for t in TARGET_NAMES] +  # lag-1
            [self._last_scores.get(t, 50) for t in TARGET_NAMES] +  # lag-3
            [1.0]                                                     # time trend
        )

        feat = np.array(row).reshape(1, -1)
        if np.any(np.isnan(feat)) or np.any(np.isinf(feat)):
            return self._mock_predict(params)

        predictions = {}
        for t in TARGET_NAMES:
            try:
                if self.model_type == "time_series_xgboost":
                    pred = float(self.models[t].predict(feat)[0])
                else:
                    Xs   = self.scalers[t].transform(feat)
                    pred = float(self.models[t].predict(Xs)[0])
                predictions[t] = round(max(0.0, min(100.0, pred)), 1)
            except Exception:
                predictions[t] = 50.0

        return {
            "success":            True,
            "predictions":        predictions,
            "confidence":         self.accuracy,
            "feature_importance": self.feature_importance,
            "model":              self.model_type,
            "trend":              self._score_trend,
        }

    # ── Cross-domain cascade ──────────────────────────────────────────────────

    def _raw_predict_row(self, params: dict, lag_scores: dict) -> dict:
        """Predict with explicit lag scores (for cascade simulation)."""
        row = (
            [float(params.get(f, 0)) for f in HABIT_FEATURES] +
            [float(params.get(f, 0)) for f in HABIT_FEATURES] +
            [float(lag_scores.get(t, 50)) for t in TARGET_NAMES] +
            [float(lag_scores.get(t, 50)) for t in TARGET_NAMES] +
            [1.0]
        )
        feat = np.array(row).reshape(1, -1)
        if np.any(np.isnan(feat)) or np.any(np.isinf(feat)):
            return {t: float(lag_scores.get(t, 50)) for t in TARGET_NAMES}
        predictions = {}
        for t in TARGET_NAMES:
            try:
                if self.model_type == "time_series_xgboost":
                    pred = float(self.models[t].predict(feat)[0])
                else:
                    Xs   = self.scalers[t].transform(feat)
                    pred = float(self.models[t].predict(Xs)[0])
                predictions[t] = round(max(0.0, min(100.0, pred)), 1)
            except Exception:
                predictions[t] = float(lag_scores.get(t, 50))
        return predictions

    def compute_cascade(self, params: dict) -> dict:
        """
        For each cross-domain rule, compute XGBoost-derived impact values.

        Step 1 (direct): perturb the "from" feature to its stress value, compare
                         predicted scores to baseline.
        Step 2 (cascade): feed step-1 predicted scores back as lag features, predict
                          again — this simulates downstream momentum (health decline
                          lowering career the next period, etc.).

        Returns per-rule deltas so JS can replace hardcoded formulas in
        detectCrossDomainRelationships with ML-derived magnitudes.
        """
        if not self.trained:
            return self._mock_cascade(params)

        baseline = self._raw_predict_row(params, self._last_scores)

        # Each entry: feature changes that "trigger" the rule, plus the primary target domain
        perturbations = {
            "sleep-productivity": {
                "changes": {"sleep_hours": max(3.0, float(params.get("sleep_hours", 7)) - 3.0)},
                "target": "career_score",
            },
            "stress-spending": {
                "changes": {"stress_level": min(10.0, float(params.get("stress_level", 5)) + 3.0)},
                "target": "finance_score",
            },
            "exercise-deficit": {
                "changes": {"workout_minutes": 0.0},
                "target": "career_score",
            },
            "financial-stress": {
                "changes": {
                    "savings_months": max(0.0, float(params.get("savings_months", 2)) - 3.0),
                    "debt_ratio":     min(3.0, float(params.get("debt_ratio",     0.3)) + 1.0),
                },
                "target": "health_score",
            },
            "overwork-health": {
                "changes": {
                    "study_hours":  min(12.0, float(params.get("study_hours",  3)) + 3.0),
                    "coding_hours": min(8.0,  float(params.get("coding_hours", 2)) + 2.0),
                },
                "target": "health_score",
            },
        }

        pairs = {}
        for rule_id, config in perturbations.items():
            perturbed = dict(params)
            perturbed.update(config["changes"])

            # Step 1: direct effect of perturbation
            step1 = self._raw_predict_row(perturbed, self._last_scores)
            direct = {k: round(step1[k] - baseline[k], 2) for k in TARGET_NAMES}

            # Step 2: cascade — step1 scores become the lag context for the next period
            step2 = self._raw_predict_row(perturbed, step1)
            cascade = {k: round(step2[k] - baseline[k], 2) for k in TARGET_NAMES}

            pairs[rule_id] = {
                "direct":  direct,
                "cascade": cascade,
                "target":  config["target"],
            }

        return {
            "baseline": baseline,
            "pairs":    pairs,
            "model":    self.model_type,
        }

    def _mock_cascade(self, params: dict) -> dict:
        sleep   = float(params.get("sleep_hours",     7))
        stress  = float(params.get("stress_level",    5))
        workout = float(params.get("workout_minutes", 30))
        study   = float(params.get("study_hours",     3))
        coding  = float(params.get("coding_hours",    2))
        savings = float(params.get("savings_months",  2))
        debt    = float(params.get("debt_ratio",      0.3))

        sc = round(max(0, (8 - max(3.0, sleep - 3)) / 8) * 22, 1)
        sf = round(min(10, stress + 3) / 10 * 14, 1)
        ec = round(min(workout / 60, 1) * 13, 1)
        fh = round(max(0, 3 - max(0, savings - 3)) * 2.5 + min(3, debt + 1) * 3, 1)
        oh = round((min(12, study + 3) + min(8, coding + 2)) * 0.9, 1)

        baseline = {t: 60.0 for t in TARGET_NAMES}
        def dn(v): return round(-v, 1)
        return {
            "baseline": baseline,
            "pairs": {
                "sleep-productivity": {
                    "direct":  {"health_score": 0.0, "finance_score": 0.0, "career_score": dn(sc)},
                    "cascade": {"health_score": dn(sc * 0.3), "finance_score": 0.0, "career_score": dn(sc * 1.2)},
                    "target":  "career_score",
                },
                "stress-spending": {
                    "direct":  {"health_score": 0.0, "finance_score": dn(sf), "career_score": 0.0},
                    "cascade": {"health_score": dn(sf * 0.2), "finance_score": dn(sf * 1.1), "career_score": 0.0},
                    "target":  "finance_score",
                },
                "exercise-deficit": {
                    "direct":  {"health_score": 0.0, "finance_score": 0.0, "career_score": dn(ec)},
                    "cascade": {"health_score": dn(ec * 0.4), "finance_score": 0.0, "career_score": dn(ec * 1.15)},
                    "target":  "career_score",
                },
                "financial-stress": {
                    "direct":  {"health_score": dn(fh), "finance_score": 0.0, "career_score": 0.0},
                    "cascade": {"health_score": dn(fh * 1.2), "finance_score": 0.0, "career_score": dn(fh * 0.3)},
                    "target":  "health_score",
                },
                "overwork-health": {
                    "direct":  {"health_score": dn(oh), "finance_score": 0.0, "career_score": 0.0},
                    "cascade": {"health_score": dn(oh * 1.1), "finance_score": 0.0, "career_score": dn(oh * 0.5)},
                    "target":  "health_score",
                },
            },
            "model": "mock",
        }

    # ── Fallbacks ─────────────────────────────────────────────────────────────

    def _mock_train(self, historical_data: List[dict]) -> dict:
        self.trained    = True
        self.model_type = "mock"
        self.accuracy   = {"health_score": 0.82, "finance_score": 0.79, "career_score": 0.76}
        self.feature_importance = {
            "health_score":  [0.28, 0.22, 0.18, 0.10, 0.06, 0.16],
            "finance_score": [0.07, 0.10, 0.05, 0.08, 0.38, 0.12],
            "career_score":  [0.14, 0.12, 0.08, 0.30, 0.06, 0.08],
        }
        self._last_scores = {"health_score": 60, "finance_score": 50, "career_score": 55}
        self._score_trend = {"health_score": 0.4, "finance_score": 0.2, "career_score": 0.3}
        return {
            "success": True, "trained": True,
            "sample_count": len(historical_data),
            "accuracy": self.accuracy,
            "feature_names": LIFESTYLE_FEATURES,
            "feature_importance": self.feature_importance,
            "model": "mock",
            "mock": True,
        }

    def _mock_predict(self, params: dict) -> dict:
        sleep          = float(params.get("sleep_hours",     7))
        stress         = float(params.get("stress_level",    5))
        workout        = float(params.get("workout_minutes", 30))
        study          = float(params.get("study_hours",     2))
        spending       = float(params.get("spending_ratio",  0.7))
        mood           = float(params.get("mood_score",      6))
        income_level   = float(params.get("income_level",    0.4))
        savings_months = float(params.get("savings_months",  2))
        debt_ratio     = float(params.get("debt_ratio",      0.3))
        burnout        = float(params.get("burnout_risk",    5))
        dsa            = float(params.get("dsa_problems",    1))
        coding         = float(params.get("coding_hours",    2))

        # Mock captures the most important interaction effects manually:
        # sleep×stress interaction for health, debt×income for finance,
        # burnout×coding for career
        sleep_stress_penalty = max(0, (stress - 6) * max(0, 6 - sleep) * 1.5)
        health = min(100, max(0,
            (sleep / 8) * 30 + ((10 - stress) / 10) * 25 +
            min(workout / 45, 1) * 20 + (mood / 10) * 15 +
            ((10 - burnout) / 10) * 10 - sleep_stress_penalty
        ))

        debt_income_stress = max(0, debt_ratio - 0.5) * max(0, 0.5 - income_level) * 20
        finance = min(100, max(0,
            (1 - spending) * 35 + min(income_level, 1) * 25 +
            min(savings_months / 6, 1) * 25 + max(0, 1 - debt_ratio) * 15
            - debt_income_stress
        ))

        burnout_coding_drag = max(0, burnout - 6) * min(coding, 6) * 0.8
        career = min(100, max(0,
            min(study / 6, 1) * 30 + min(coding / 5, 1) * 25 +
            min(dsa / 4, 1) * 25 + ((10 - stress) / 10) * 10 +
            (sleep / 9) * 10 - burnout_coding_drag
        ))

        return {
            "success": True,
            "predictions": {
                "health_score":  round(health,  1),
                "finance_score": round(finance, 1),
                "career_score":  round(career,  1),
            },
            "confidence": {"health_score": 0.65, "finance_score": 0.60, "career_score": 0.62},
            "feature_importance": self.feature_importance or {
                "health_score":  [0.28, 0.22, 0.18, 0.10, 0.06, 0.16],
                "finance_score": [0.07, 0.10, 0.05, 0.08, 0.38, 0.12],
                "career_score":  [0.14, 0.12, 0.08, 0.30, 0.06, 0.08],
            },
            "model": "mock_fallback",
            "trend": self._score_trend,
        }
