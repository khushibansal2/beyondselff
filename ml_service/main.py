from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents.prediction_agent import PredictionAgent
from pydantic import BaseModel
from typing import List, Optional

import os

app = FastAPI(title="Antigravity ML Pipeline")

# Allow frontend to call us, configuring via environment for production
cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prediction_agent = PredictionAgent()

# ── What-If Prediction schemas ────────────────────────────────────────────────

class TrainingRecord(BaseModel):
    sleep_hours: Optional[float] = 7.0
    stress_level: Optional[float] = 5.0
    workout_minutes: Optional[float] = 30.0
    study_hours: Optional[float] = 2.0
    spending_ratio: Optional[float] = 0.7
    mood_score: Optional[float] = 6.0
    # Financial / career state signals (added for 12-feature model)
    income_level: Optional[float] = 0.4
    savings_months: Optional[float] = 2.0
    debt_ratio: Optional[float] = 0.3
    burnout_risk: Optional[float] = 5.0
    dsa_problems: Optional[float] = 1.0
    coding_hours: Optional[float] = 2.0
    # Labels
    health_score: Optional[float] = None
    finance_score: Optional[float] = None
    career_score: Optional[float] = None

class TrainRequest(BaseModel):
    records: List[TrainingRecord]

class PredictRequest(BaseModel):
    sleep_hours: Optional[float] = 7.0
    stress_level: Optional[float] = 5.0
    workout_minutes: Optional[float] = 30.0
    study_hours: Optional[float] = 2.0
    spending_ratio: Optional[float] = 0.7
    mood_score: Optional[float] = 6.0
    # Financial / career state signals
    income_level: Optional[float] = 0.4
    savings_months: Optional[float] = 2.0
    debt_ratio: Optional[float] = 0.3
    burnout_risk: Optional[float] = 5.0
    dsa_problems: Optional[float] = 1.0
    coding_hours: Optional[float] = 2.0

class CascadeRequest(BaseModel):
    sleep_hours: Optional[float] = 7.0
    stress_level: Optional[float] = 5.0
    workout_minutes: Optional[float] = 30.0
    study_hours: Optional[float] = 2.0
    spending_ratio: Optional[float] = 0.7
    mood_score: Optional[float] = 6.0
    income_level: Optional[float] = 0.4
    savings_months: Optional[float] = 2.0
    debt_ratio: Optional[float] = 0.3
    burnout_risk: Optional[float] = 5.0
    dsa_problems: Optional[float] = 1.0
    coding_hours: Optional[float] = 2.0

# ── What-If Prediction routes ─────────────────────────────────────────────────

@app.post("/api/whatif/train")
async def train_whatif_model(request: TrainRequest):
    try:
        records = [r.dict() for r in request.records]
        return prediction_agent.train(records)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whatif/predict")
async def predict_whatif(request: PredictRequest):
    try:
        return prediction_agent.predict(request.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whatif/cascade")
async def cascade_analysis(request: CascadeRequest):
    try:
        return prediction_agent.compute_cascade(request.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/whatif/status")
async def whatif_status():
    return {
        "trained": prediction_agent.trained,
        "accuracy": prediction_agent.accuracy,
        "feature_importance": prediction_agent.feature_importance,
    }
