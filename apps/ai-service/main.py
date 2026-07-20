import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="VisionCanvas AI Service",
    description="High-performance spatial coordinate extraction and gesture classification engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
        "engine": "MediaPipe + ONNX"
    }

app.include_router(api_router, prefix="/api/v1")
