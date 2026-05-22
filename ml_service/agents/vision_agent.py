import io
import logging

logger = logging.getLogger(__name__)

try:
    import torch
    import torchvision.transforms as T
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
    from PIL import Image
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    logger.warning("PyTorch not installed. Vision Agent will run in fast MVP (mock) mode.")

class VisionAgent:
    def __init__(self):
        self.has_torch = HAS_TORCH
        if self.has_torch:
            self.weights = MobileNet_V3_Small_Weights.DEFAULT
            self.model = mobilenet_v3_small(weights=self.weights)
            self.model.eval()
            self.transforms = self.weights.transforms()
            self.categories = self.weights.meta["categories"]

    async def analyze(self, image_bytes: bytes):
        if not self.has_torch:
            # MVP Mode: simulate inference based on image size to be deterministic
            size_kb = len(image_bytes) / 1024
            if size_kb > 800:
                food = "pizza"
                conf = 0.94
            elif size_kb > 300:
                food = "salad"
                conf = 0.88
            else:
                food = "apple"
                conf = 0.98
            return {"food": food, "confidence": conf, "model": "mock_vision"}

        # Real inference
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self.transforms(img).unsqueeze(0)
            
            with torch.no_grad():
                prediction = self.model(tensor).squeeze(0).softmax(0)
                
            class_id = prediction.argmax().item()
            score = prediction[class_id].item()
            label = self.categories[class_id]
            
            return {
                "food": label.lower(),
                "confidence": round(score, 3),
                "model": "mobilenet_v3_small"
            }
        except Exception as e:
            logger.error(f"Vision Agent Error: {e}")
            return {"food": "unknown", "confidence": 0.0, "error": str(e)}
