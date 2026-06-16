from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents.vision_agent import VisionAgent
from agents.portion_agent import PortionAgent
from agents.nutrition_agent import NutritionAgent
from agents.tracking_agent import TrackingAgent
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

# Initialize Agents
vision_agent = VisionAgent()
portion_agent = PortionAgent()
nutrition_agent = NutritionAgent()
tracking_agent = TrackingAgent()
prediction_agent = PredictionAgent()

# ── What-If Prediction schemas ────────────────────────────────────────────────

class TrainingRecord(BaseModel):
    sleep_hours: Optional[float] = 7.0
    stress_level: Optional[float] = 5.0
    workout_minutes: Optional[float] = 30.0
    study_hours: Optional[float] = 2.0
    spending_ratio: Optional[float] = 0.7
    mood_score: Optional[float] = 6.0
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

@app.post("/api/analyze-meal")
async def analyze_meal(file: UploadFile = File(...), user_id: str = Form("demo_user")):
    try:
        image_bytes = await file.read()

        # Step 1: Vision Agent
        vision_result = await vision_agent.analyze(image_bytes)
        if vision_result.get("error"):
            raise HTTPException(status_code=500, detail="Vision Agent failed")
        
        food_label = vision_result["food"]

        # Step 2: Portion Agent
        portion_result = await portion_agent.estimate(food_label, image_bytes)

        # Step 3: Nutrition Agent
        nutrition_result = await nutrition_agent.get_nutrition(food_label, portion_result["multiplier"])

        # Step 4: Tracking Agent
        log_id = await tracking_agent.log_meal(user_id, nutrition_result, portion_result)

        # Construct final response
        return {
            "success": True,
            "log_id": log_id,
            "foodName": nutrition_result["foodName"],
            "calories": nutrition_result["calories"],
            "protein": nutrition_result["protein"],
            "carbs": nutrition_result["carbs"],
            "fat": nutrition_result["fat"],
            "confidence": vision_result["confidence"],
            "portion": portion_result["portion"]
        }

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


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

@app.get("/api/whatif/status")
async def whatif_status():
    return {
        "trained": prediction_agent.trained,
        "accuracy": prediction_agent.accuracy,
        "feature_importance": prediction_agent.feature_importance,
    }
