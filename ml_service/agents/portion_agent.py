class PortionAgent:
    def __init__(self):
        pass

    async def estimate(self, food: str, image_bytes: bytes):
        food_lower = food.lower()
        if "pizza" in food_lower:
            return {"portion": "2 slices", "multiplier": 2.0}
        elif "salad" in food_lower or "bowl" in food_lower:
            return {"portion": "1 large bowl", "multiplier": 1.5}
        elif "burger" in food_lower or "sandwich" in food_lower:
            return {"portion": "1 serving", "multiplier": 1.0}
        else:
            return {"portion": "1 standard serving", "multiplier": 1.0}
