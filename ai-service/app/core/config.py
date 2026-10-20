import os
from pathlib import Path

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    # Fallback if pydantic-settings is not yet installed
    from pydantic import BaseModel as BaseSettings
    SettingsConfigDict = dict


class Settings(BaseSettings):
    # Service Information
    PROJECT_NAME: str = "EventPass AI Microservice"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DESCRIPTION: str = "Fast Face Recognition & Embedding Extraction Service for EventPass Kiosk Check-in"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Security & Internal Authentication (Between .NET Core and AI Service)
    AI_INTERNAL_API_KEY: str = "eventpass_internal_ai_token_2026"
    REQUIRE_API_KEY: bool = True

    # Face Recognition Engine Settings
    # Model choices: "Facenet512", "ArcFace", "VGG-Face", "Facenet"
    # Facenet512 & ArcFace output exact 512-d vector for PostgreSQL pgvector(512)
    MODEL_NAME: str = "Facenet512"
    
    # Detector backend choices: "opencv" (fastest ~30ms), "ssd", "mediapipe", "retinaface"
    DETECTOR_BACKEND: str = "opencv"
    
    # Distance metric for matching: "cosine", "euclidean", "euclidean_l2"
    DISTANCE_METRIC: str = "cosine"
    
    # Vector dimension for PostgreSQL schema validation
    VECTOR_DIMENSION: int = 512
    
    # Default Cosine Distance Threshold (Distance < threshold means MATCH)
    # Cosine Distance = 1 - Cosine Similarity. 
    # For Facenet512, distance <= 0.30 (similarity >= 0.70) is considered a confident match
    DEFAULT_COSINE_THRESHOLD: float = 0.32

    # Image Quality Thresholds (FIQA: Blur, Resolution, Illumination)
    MIN_FACE_WIDTH: int = 80
    MIN_FACE_HEIGHT: int = 80
    BLUR_LAPLACIAN_THRESHOLD: float = 45.0  # Under 45 is considered blurry
    MIN_BRIGHTNESS: float = 40.0   # Dưới 40 là quá tối (underexposed)
    MAX_BRIGHTNESS: float = 225.0  # Trên 225 là chói lóa / cháy sáng (overexposed)

    # Anti-Spoofing / Liveness Detection (MiniFASNet)
    DEFAULT_ANTI_SPOOFING: bool = False

    # Startup Warm-up
    WARM_UP_ON_STARTUP: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Load from parent .env if available
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
