import time
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import verify_internal_api_key
from app.services.deepface_service import deepface_service
from app.utils.image_processing import bytes_to_cv2, base64_to_cv2

router = APIRouter()
logger = logging.getLogger("eventpass.ai.api")


class Base64ExtractRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded string of the camera frame or image file")
    enforce_detection: bool = Field(True, description="Whether to strictly reject frames without detected faces")
    anti_spoofing: bool = Field(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)")


class ExtractionResponse(BaseModel):
    success: bool
    error_code: Optional[str] = None
    message: str
    embedding: Optional[list[float]] = None
    dimension: int
    face_detected: bool = False
    is_real: Optional[bool] = None
    face_confidence: float = 0.0
    facial_area: Optional[dict] = None
    multiple_faces_detected: bool = False
    total_faces_count: int = 0
    is_blurry: bool = False
    blur_score: float = 0.0
    is_too_dark: bool = False
    is_too_bright: bool = False
    brightness_score: float = 0.0
    is_too_small: bool = False
    execution_time_ms: float


@router.post(
    "/face/extract",
    response_model=ExtractionResponse,
    summary="Extract 512-d Face Vector from Uploaded File (UC14, UC05)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def extract_face_from_file(
    file: UploadFile = File(..., description="Binary image file (.jpg, .png) from Kiosk or User"),
    enforce_detection: bool = Form(True, description="Strictly check for face presence"),
    anti_spoofing: bool = Form(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)")
):
    """
    **Điểm danh Kiosk (UC14) & Nạp Face ID cá nhân (UC05):**
    Nhận tệp ảnh nhị phân -> Tiền xử lý -> Trích xuất vector đặc trưng 512 chiều.
    Vector này sẽ được Backend .NET Core lưu vào cột `face_vector VECTOR(512)` hoặc đối soát qua `pgvector`.
    """
    t_start = time.time()

    # 1. Kiểm tra định dạng tệp hợp lệ
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "application/octet-stream"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_IMAGE_TYPE", "message": "Hệ thống chỉ chấp nhận tệp ảnh JPG, PNG hoặc WEBP."}
        )

    try:
        t0 = time.time()
        image_bytes = await file.read()
        t_read = (time.time() - t0) * 1000

        t0 = time.time()
        cv2_image = bytes_to_cv2(image_bytes)
        t_decode = (time.time() - t0) * 1000
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DECODE_ERROR", "message": f"Không thể giải mã dữ liệu ảnh: {str(e)}"}
        )

    # 2. Trích xuất vector
    t0 = time.time()
    result = deepface_service.extract_embedding(
        cv2_image,
        enforce_detection=enforce_detection,
        anti_spoofing=anti_spoofing
    )
    t_extract = (time.time() - t0) * 1000
    t_total = (time.time() - t_start) * 1000

    logger.info(
        f"⚡ [AI-PROFILE] Read={t_read:.1f}ms | Decode&Resize={t_decode:.1f}ms | Extract={t_extract:.1f}ms | Total={t_total:.1f}ms"
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result


@router.post(
    "/face/extract-base64",
    response_model=ExtractionResponse,
    summary="Extract 512-d Face Vector from Base64 Frame (Kiosk Webcam Canvas)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def extract_face_from_base64(payload: Base64ExtractRequest):
    """
    **Trạm Kiosk Camera Direct Frame (UC14):**
    Nhận chuỗi Base64 chụp trực tiếp từ Canvas Webcam của Frontend Kiosk.
    """
    try:
        cv2_image = base64_to_cv2(payload.image_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DECODE_ERROR", "message": f"Không thể giải mã chuỗi Base64: {str(e)}"}
        )

    result = deepface_service.extract_embedding(
        cv2_image,
        enforce_detection=payload.enforce_detection,
        anti_spoofing=payload.anti_spoofing
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result
