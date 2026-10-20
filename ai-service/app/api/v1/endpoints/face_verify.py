from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import verify_internal_api_key
from app.services.deepface_service import deepface_service
from app.utils.image_processing import bytes_to_cv2, base64_to_cv2

router = APIRouter()


class Base64VerifyRequest(BaseModel):
    image1_base64: str = Field(..., description="Base64 of the registered profile face (Ảnh gốc hồ sơ)")
    image2_base64: str = Field(..., description="Base64 of the live photo taken at helpdesk/kiosk (Ảnh chụp thực tế)")
    threshold: Optional[float] = Field(None, description="Custom cosine distance threshold (Default: 0.32)")
    anti_spoofing: bool = Field(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)")


class VerificationResponse(BaseModel):
    success: bool
    verified: bool
    is_real: Optional[bool] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
    distance: float
    threshold_used: float
    similarity_percent: float
    model: str
    detector: str
    execution_time_ms: float


@router.post(
    "/face/verify",
    response_model=VerificationResponse,
    summary="1:1 Direct Face Verification between 2 Files (UC12 Quầy hỗ trợ)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def verify_two_faces_file(
    file1: UploadFile = File(..., description="Ảnh gốc đã đăng ký hồ sơ"),
    file2: UploadFile = File(..., description="Ảnh chụp đối chiếu thực tế tại quầy"),
    threshold: Optional[float] = Form(None, description="Ngưỡng khoảng cách Cosine Distance (Mặc định: 0.32)"),
    anti_spoofing: bool = Form(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)")
):
    """
    **Quầy hỗ trợ & Đối soát thủ công (UC12):**
    So khớp trực tiếp 1:1 giữa ảnh gốc của vé và người tham dự đang đứng tại Quầy hỗ trợ.
    """
    try:
        bytes1 = await file1.read()
        bytes2 = await file2.read()
        img1 = bytes_to_cv2(bytes1)
        img2 = bytes_to_cv2(bytes2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DECODE_ERROR", "message": f"Không thể giải mã dữ liệu ảnh: {str(e)}"}
        )

    result = deepface_service.verify_two_faces(
        img1,
        img2,
        threshold=threshold,
        anti_spoofing=anti_spoofing
    )
    return result


@router.post(
    "/face/verify-base64",
    response_model=VerificationResponse,
    summary="1:1 Direct Face Verification via Base64 (UC12 Quầy hỗ trợ)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def verify_two_faces_base64(payload: Base64VerifyRequest):
    """
    So khớp 1:1 trực tiếp qua chuỗi Base64.
    """
    try:
        img1 = base64_to_cv2(payload.image1_base64)
        img2 = base64_to_cv2(payload.image2_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_BASE64", "message": f"Dữ liệu Base64 không hợp lệ: {str(e)}"}
        )

    result = deepface_service.verify_two_faces(
        img1,
        img2,
        threshold=payload.threshold,
        anti_spoofing=payload.anti_spoofing
    )
    return result
