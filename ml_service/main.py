from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents.vision_agent import VisionAgent
from agents.portion_agent import PortionAgent
from agents.nutrition_agent import NutritionAgent
from agents.tracking_agent import TrackingAgent

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
