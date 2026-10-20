import time
from fastapi import APIRouter
from app.core.config import settings
from app.services.deepface_service import deepface_service

router = APIRouter()
service_start_time = time.time()


@router.get("/health", summary="Health check & Model Readiness")
async def health_check():
    """
    Kiểm tra tình trạng hoạt động của AI Service và trạng thái nạp Model.
    Dùng cho Docker healthcheck và Backend Core ping kiểm tra.
    """
    uptime_seconds = round(time.time() - service_start_time, 2)
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": uptime_seconds,
        "engine": {
            "model_name": settings.MODEL_NAME,
            "detector_backend": settings.DETECTOR_BACKEND,
            "vector_dimension": settings.VECTOR_DIMENSION,
            "distance_metric": settings.DISTANCE_METRIC,
            "is_warmed_up": deepface_service.is_warmed_up
        }
    }
