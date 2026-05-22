import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class MealLog(Base):
    __tablename__ = 'meal_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    food = Column(String)
    portion = Column(String)
    calories = Column(Integer)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class TrackingAgent:
    def __init__(self, db_path="sqlite:///./meals.db"):
        self.engine = create_engine(db_path, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    async def log_meal(self, user_id: str, nutrition_data: dict, portion_data: dict):
        db = self.SessionLocal()
        try:
            log = MealLog(
                user_id=user_id,
                food=nutrition_data["foodName"],
                portion=portion_data["portion"],
                calories=nutrition_data["calories"],
                protein=nutrition_data["protein"],
                carbs=nutrition_data["carbs"],
                fat=nutrition_data["fat"]
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            return log.id
        except Exception as e:
            print(f"DB Error: {e}")
            return None
        finally:
            db.close()
