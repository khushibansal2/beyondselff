"""
Time-Series Prediction Agent
Uses Ridge Regression enriched with lag features + rolling averages + time trend.

Why this is time-series:
- Lag features (t-1, t-3 scores) capture momentum / autocorrelation
- Rolling 7-day habit averages capture consistency, not just point-in-time
- Time trend captures overall trajectory (improving vs declining)
- Prediction uses recent actual scores as lag context → "given where you are
  headed, what happens if habits change to X?"
"""

import numpy as np
from typing import Dict, List, Optional

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

HABIT_FEATURES = [
    "sleep_hours", "stress_level", "workout_minutes",
    "study_hours", "spending_ratio", "mood_score",
]
TARGET_NAMES = ["health_score", "finance_score", "career_score"]


def _rolling_mean(values: list, window: int) -> list:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(float(np.mean(values[start:i + 1])))
    return result


class PredictionAgent:
    def __init__(self):
        self.models: Dict[str, object] = {}
        self.scalers: Dict[str, object] = {}
        self.trained = False
        self.accuracy: Dict[str, float] = {}
        self.feature_importance: Dict[str, List[float]] = {}
        # Keep last known scores so prediction can use them as lag context
        self._last_scores: Dict[str, float] = {}
        self._score_trend: Dict[str, float] = {}   # avg change per step

    # ── Feature engineering ───────────────────────────────────────────────────

    def _build_features(self, records: List[dict]):
        """
        Build enriched feature matrix from ordered records.
        Returns (X, y_dict) where X rows correspond to records[1:] (we need
        at least lag-1, so the first record is consumed as context).
        """
        n = len(records)

        # Extract raw series
        habit_series = {f: [float(r.get(f, 0)) for r in records] for f in HABIT_FEATURES}
        score_series = {t: [float(r.get(t, 50)) for r in records] for t in TARGET_NAMES}

        # Rolling 7-day means per habit
        rolling = {f: _rolling_mean(habit_series[f], 7) for f in HABIT_FEATURES}

        X_rows = []
        y = {t: [] for t in TARGET_NAMES}

        for i in range(1, n):   # start at 1 so lag-1 is always available
            lag1 = {t: score_series[t][i - 1] for t in TARGET_NAMES}
            lag3 = {t: score_series[t][max(0, i - 3)] for t in TARGET_NAMES}

            # Normalised time trend: 0 = oldest, 1 = newest
            trend = i / (n - 1) if n > 1 else 0.5

            row = []
            # Current habit values
            for f in HABIT_FEATURES:
                row.append(habit_series[f][i])
            # 7-day rolling habit averages
            for f in HABIT_FEATURES:
                row.append(rolling[f][i])
            # Lag scores
            for t in TARGET_NAMES:
                row.append(lag1[t])
                row.append(lag3[t])
            # Time trend
            row.append(trend)

            if any(np.isnan(v) or np.isinf(v) for v in row):
                continue

            X_rows.append(row)
            for t in TARGET_NAMES:
                y[t].append(score_series[t][i])

        return np.array(X_rows), y

    # ── Training ──────────────────────────────────────────────────────────────

    def train(self, historical_data: List[dict]) -> dict:
        if not SKLEARN_AVAILABLE:
            return self._mock_train(historical_data)
        if len(historical_data) < 6:
            return {"success": False, "error": "Need at least 6 data points", "trained": False}

        # Sort by index (assume ordered; if date present, sort by it)
        records = sorted(historical_data, key=lambda r: r.get("date", r.get("ds", "")))

        X, y_dict = self._build_features(records)
        if len(X) < 5:
            return {"success": False, "error": "Insufficient valid rows after feature engineering", "trained": False}

        # Store last-known scores for lag context at prediction time
        last = records[-1]
        for t in TARGET_NAMES:
            self._last_scores[t] = float(last.get(t, 50))

        # Compute per-target score trend (mean change per step over last 5 records)
        tail = records[-5:]
        for t in TARGET_NAMES:
            vals = [float(r.get(t, 50)) for r in tail]
            diffs = [vals[i] - vals[i - 1] for i in range(1, len(vals))]
            self._score_trend[t] = float(np.mean(diffs)) if diffs else 0.0

        n_feat = X.shape[1]

        for t in TARGET_NAMES:
            y = np.array(y_dict[t])
            scaler = StandardScaler()
            Xs = scaler.fit_transform(X)
            model = Ridge(alpha=1.0)

            if len(X) >= 10:
                cv = min(5, len(X))
                scores = cross_val_score(model, Xs, y, cv=cv, scoring="r2")
                acc = float(np.mean(scores))
            else:
                model.fit(Xs, y)
                preds = model.predict(Xs)
                ss_res = np.sum((y - preds) ** 2)
                ss_tot = np.sum((y - np.mean(y)) ** 2)
                acc = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

            model.fit(Xs, y)
            self.models[t] = model
            self.scalers[t] = scaler
            self.accuracy[t] = round(max(0.0, min(1.0, acc)), 3)

            # Feature importance: only first len(HABIT_FEATURES) dims = current habits
            coefs = np.abs(model.coef_[:len(HABIT_FEATURES)])
            total = coefs.sum()
            self.feature_importance[t] = (coefs / total).tolist() if total > 0 else [1 / len(HABIT_FEATURES)] * len(HABIT_FEATURES)

        self.trained = True
        return {
            "success": True,
            "trained": True,
            "sample_count": len(X),
            "accuracy": self.accuracy,
            "feature_names": HABIT_FEATURES,
            "feature_importance": self.feature_importance,
            "model": "time_series_ridge",
        }

    # ── Prediction ────────────────────────────────────────────────────────────

    def predict(self, params: dict) -> dict:
        if not SKLEARN_AVAILABLE or not self.trained:
            return self._mock_predict(params)

        # Build one feature row using:
        #   current habits = what-if params
        #   rolling averages ≈ midpoint between current & what-if (plausible near-future avg)
        #   lag scores = last known actuals (momentum from real history)
        #   time trend = 1.0 (predicting the next step beyond training data)
        lag_scores = self._last_scores

        row = []
        for f in HABIT_FEATURES:
            row.append(float(params.get(f, 5)))
        # Rolling avg: blend of current trajectory and new what-if value
        for f in HABIT_FEATURES:
            current_val = float(params.get(f, 5))
            row.append(current_val)   # simplified: assume new habit is sustained
        for t in TARGET_NAMES:
            row.append(lag_scores.get(t, 50))   # lag-1
            row.append(lag_scores.get(t, 50))   # lag-3 (same if we only have last)
        row.append(1.0)   # time trend at prediction horizon

        feat = np.array(row)
        if any(np.isnan(v) or np.isinf(v) for v in feat):
            return self._mock_predict(params)

        predictions = {}
        for t in TARGET_NAMES:
            Xs = self.scalers[t].transform(feat.reshape(1, -1))
            pred = float(self.models[t].predict(Xs)[0])
            predictions[t] = round(max(0.0, min(100.0, pred)), 1)

        return {
            "success": True,
            "predictions": predictions,
            "confidence": self.accuracy,
            "feature_importance": self.feature_importance,
            "model": "time_series_ridge",
            "trend": self._score_trend,
        }

    # ── Fallbacks ─────────────────────────────────────────────────────────────

    def _mock_train(self, historical_data: List[dict]) -> dict:
        self.trained = True
        self.accuracy = {"health_score": 0.74, "finance_score": 0.70, "career_score": 0.67}
        self.feature_importance = {
            "health_score":  [0.32, 0.24, 0.18, 0.12, 0.08, 0.06],
            "finance_score": [0.09, 0.14, 0.07, 0.11, 0.46, 0.13],
            "career_score":  [0.18, 0.17, 0.09, 0.36, 0.10, 0.10],
        }
        self._last_scores = {"health_score": 60, "finance_score": 50, "career_score": 55}
        self._score_trend = {"health_score": 0.4, "finance_score": 0.2, "career_score": 0.3}
        return {
            "success": True, "trained": True,
            "sample_count": len(historical_data),
            "accuracy": self.accuracy,
            "feature_names": HABIT_FEATURES,
            "feature_importance": self.feature_importance,
            "model": "time_series_ridge",
            "mock": True,
        }

    def _mock_predict(self, params: dict) -> dict:
        sleep    = float(params.get("sleep_hours", 7))
        stress   = float(params.get("stress_level", 5))
        workout  = float(params.get("workout_minutes", 30))
        study    = float(params.get("study_hours", 2))
        spending = float(params.get("spending_ratio", 0.7))
        mood     = float(params.get("mood_score", 6))

        health  = min(100, max(0, (sleep/8*40) + ((10-stress)/10*35) + (workout/60*25)))
        finance = min(100, max(0, ((1-spending)*70) + (mood/10*30)))
        career  = min(100, max(0, (study/8*50) + ((10-stress)/10*30) + (sleep/8*20)))

        return {
            "success": True,
            "predictions": {
                "health_score": round(health, 1),
                "finance_score": round(finance, 1),
                "career_score": round(career, 1),
            },
            "confidence": {"health_score": 0.65, "finance_score": 0.60, "career_score": 0.62},
            "feature_importance": self.feature_importance or {
                "health_score":  [0.32, 0.24, 0.18, 0.12, 0.08, 0.06],
                "finance_score": [0.09, 0.14, 0.07, 0.11, 0.46, 0.13],
                "career_score":  [0.18, 0.17, 0.09, 0.36, 0.10, 0.10],
            },
            "model": "mock_fallback",
            "trend": self._score_trend,
        }
