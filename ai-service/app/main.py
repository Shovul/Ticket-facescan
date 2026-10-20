import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.services.deepface_service import deepface_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("eventpass.ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events: Model warm-up on startup to eliminate cold-start latency for Kiosks.
    """
    logger.info("==========================================================")
    logger.info(f"🎫 {settings.PROJECT_NAME} v{settings.VERSION} STARTING")
    logger.info(f"   Model: {settings.MODEL_NAME} | Detector: {settings.DETECTOR_BACKEND}")
    logger.info(f"   Vector Dimension: {settings.VECTOR_DIMENSION}-d (pgvector compatible)")
    logger.info("==========================================================")

    # Warm-up model
    if settings.WARM_UP_ON_STARTUP:
        try:
            deepface_service.warm_up()
        except Exception as e:
            logger.error(f"Warm-up failed: {str(e)}")

    yield

    logger.info(f"🛑 {settings.PROJECT_NAME} Shutting down gracefully...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Middleware (Enable Kiosk Frontend & .NET Core Backend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routes
app.include_router(api_router)

# SGU Specification Compatibility (Khớp 100% Bảng 6.1 Hồ Sơ Thiết Kế SGU)
from fastapi import Depends
from app.core.security import verify_internal_api_key
from app.api.v1.endpoints.face_extract import extract_face_from_file, ExtractionResponse

app.add_api_route(
    "/api/ai/extract-embeddings",
    extract_face_from_file,
    methods=["POST"],
    response_model=ExtractionResponse,
    summary="[SGU Spec Bảng 6.1] Trích xuất vector khuôn mặt 512-d",
    description="Endpoint nội bộ khớp 100% với Hồ sơ Thiết kế EventPass SGU (Bảng 6.1): Dịch vụ AI DeepFace trích xuất vector khuôn mặt 512-d phục vụ UC05 và UC14.",
    tags=["SGU Hồ Sơ Thiết Kế (Bảng 6.1)"],
    dependencies=[Depends(verify_internal_api_key)]
)


@app.get("/", summary="Root Health Landing", tags=["Health & System"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1_prefix": settings.API_V1_STR
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Đã xảy ra sự cố nội bộ trong quá trình xử lý AI. Vui lòng thử lại sau.",
            "detail": str(exc) if settings.DEBUG else None
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
