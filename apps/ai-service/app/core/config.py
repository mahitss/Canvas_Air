import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "VisionCanvas AI"
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "./models")
    CONFIDENCE_THRESHOLD: float = 0.70

settings = Settings()
