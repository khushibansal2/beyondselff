import numpy as np
from typing import Dict, List, Optional

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

FEATURE_NAMES = [
    "sleep_hours",
    "stress_level",
    "workout_minutes",
    "study_hours",
    "spending_ratio",
    "mood_score",
]

TARGET_NAMES = ["health_score", "finance_score", "career_score"]


class PredictionAgent:
    def __init__(self):
        self.models: Dict[str, object] = {}
        self.scalers: Dict[str, object] = {}
        self.trained = False
        self.accuracy: Dict[str, float] = {}
        self.feature_importance: Dict[str, List[float]] = {}

    def _extract_features(self, record: dict) -> Optional[np.ndarray]:
        try:
            features = [
                float(record.get("sleep_hours", 7)),
                float(record.get("stress_level", 5)),
                float(record.get("workout_minutes", 30)),
                float(record.get("study_hours", 2)),
                float(record.get("spending_ratio", 0.7)),
                float(record.get("mood_score", 6)),
            ]
            if any(np.isnan(f) or np.isinf(f) for f in features):
                return None
            return np.array(features)
        except (TypeError, ValueError):
            return None

    def train(self, historical_data: List[dict]) -> dict:
        if not SKLEARN_AVAILABLE:
            return self._mock_train(historical_data)

        if len(historical_data) < 5:
            return {
                "success": False,
                "error": "Need at least 5 data points to train",
                "trained": False,
            }

        X_rows, y_health, y_finance, y_career = [], [], [], []

        for record in historical_data:
            features = self._extract_features(record)
            if features is None:
                continue
            h = record.get("health_score")
            f = record.get("finance_score")
            c = record.get("career_score")
            if h is None or f is None or c is None:
                continue
            X_rows.append(features)
            y_health.append(float(h))
            y_finance.append(float(f))
            y_career.append(float(c))

        if len(X_rows) < 5:
            return {
                "success": False,
                "error": "Insufficient valid records after filtering",
                "trained": False,
            }

        X = np.array(X_rows)
        targets = {
            "health_score": np.array(y_health),
            "finance_score": np.array(y_finance),
            "career_score": np.array(y_career),
        }

        for target_name, y in targets.items():
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            model = Ridge(alpha=1.0)

            if len(X_rows) >= 10:
                cv_scores = cross_val_score(
                    model, X_scaled, y, cv=min(5, len(X_rows)), scoring="r2"
                )
                accuracy = float(np.mean(cv_scores))
            else:
                model.fit(X_scaled, y)
                preds = model.predict(X_scaled)
                ss_res = np.sum((y - preds) ** 2)
                ss_tot = np.sum((y - np.mean(y)) ** 2)
                accuracy = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

            model.fit(X_scaled, y)
            self.models[target_name] = model
            self.scalers[target_name] = scaler
            self.accuracy[target_name] = round(max(0.0, min(1.0, accuracy)), 3)

            coefs = np.abs(model.coef_)
            total = coefs.sum()
            importance = (coefs / total).tolist() if total > 0 else [1 / len(FEATURE_NAMES)] * len(FEATURE_NAMES)
            self.feature_importance[target_name] = importance

        self.trained = True
        return {
            "success": True,
            "trained": True,
            "sample_count": len(X_rows),
            "accuracy": self.accuracy,
            "feature_names": FEATURE_NAMES,
            "feature_importance": self.feature_importance,
        }

    def predict(self, params: dict) -> dict:
        if not SKLEARN_AVAILABLE or not self.trained:
            return self._mock_predict(params)

        features = self._extract_features(params)
        if features is None:
            return {"success": False, "error": "Invalid parameters"}

        predictions = {}
        for target_name in TARGET_NAMES:
            if target_name not in self.models:
                predictions[target_name] = None
                continue
            X_scaled = self.scalers[target_name].transform(features.reshape(1, -1))
            pred = float(self.models[target_name].predict(X_scaled)[0])
            predictions[target_name] = round(max(0.0, min(100.0, pred)), 1)

        return {
            "success": True,
            "predictions": predictions,
            "confidence": self.accuracy,
            "feature_importance": self.feature_importance,
            "model": "ridge_regression",
        }

    def _mock_train(self, historical_data: List[dict]) -> dict:
        self.trained = True
        self.accuracy = {
            "health_score": 0.72,
            "finance_score": 0.68,
            "career_score": 0.65,
        }
        self.feature_importance = {
            "health_score":  [0.35, 0.25, 0.20, 0.10, 0.05, 0.05],
            "finance_score": [0.10, 0.15, 0.08, 0.12, 0.45, 0.10],
            "career_score":  [0.20, 0.18, 0.10, 0.35, 0.07, 0.10],
        }
        return {
            "success": True,
            "trained": True,
            "sample_count": len(historical_data),
            "accuracy": self.accuracy,
            "feature_names": FEATURE_NAMES,
            "feature_importance": self.feature_importance,
            "mock": True,
        }

    def _mock_predict(self, params: dict) -> dict:
        sleep    = float(params.get("sleep_hours", 7))
        stress   = float(params.get("stress_level", 5))
        workout  = float(params.get("workout_minutes", 30))
        study    = float(params.get("study_hours", 2))
        spending = float(params.get("spending_ratio", 0.7))
        mood     = float(params.get("mood_score", 6))

        health  = min(100, max(0, (sleep / 8 * 40) + ((10 - stress) / 10 * 35) + (workout / 60 * 25)))
        finance = min(100, max(0, ((1 - spending) * 70) + (mood / 10 * 30)))
        career  = min(100, max(0, (study / 8 * 50) + ((10 - stress) / 10 * 30) + (sleep / 8 * 20)))

        return {
            "success": True,
            "predictions": {
                "health_score":  round(health, 1),
                "finance_score": round(finance, 1),
                "career_score":  round(career, 1),
            },
            "confidence": {
                "health_score": 0.65,
                "finance_score": 0.60,
                "career_score": 0.62,
            },
            "feature_importance": {
                "health_score":  [0.35, 0.25, 0.20, 0.10, 0.05, 0.05],
                "finance_score": [0.10, 0.15, 0.08, 0.12, 0.45, 0.10],
                "career_score":  [0.20, 0.18, 0.10, 0.35, 0.07, 0.10],
            },
            "model": "mock_fallback",
        }
