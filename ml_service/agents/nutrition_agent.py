class NutritionAgent:
    def __init__(self):
        # MVP Local JSON DB
        self.db = {
            "pizza": {"calories": 266, "protein": 11.0, "carbs": 33.0, "fat": 10.0},
            "salad": {"calories": 150, "protein": 5.0, "carbs": 12.0, "fat": 9.0},
            "apple": {"calories": 95, "protein": 0.5, "carbs": 25.0, "fat": 0.3},
            "burger": {"calories": 354, "protein": 17.0, "carbs": 32.0, "fat": 17.0},
            "default": {"calories": 200, "protein": 10.0, "carbs": 20.0, "fat": 10.0}
        }

    async def get_nutrition(self, food: str, multiplier: float):
        food_key = next((k for k in self.db.keys() if k in food.lower()), "default")
        base = self.db[food_key]
        
        return {
            "calories": int(base["calories"] * multiplier),
            "protein": round(base["protein"] * multiplier, 1),
            "carbs": round(base["carbs"] * multiplier, 1),
            "fat": round(base["fat"] * multiplier, 1),
            "foodName": food.title()
        }
