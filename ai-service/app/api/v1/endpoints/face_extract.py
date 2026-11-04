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
    image_base64: str = Field(..., description="Chuỗi Base64 của khung hình webcam hoặc tệp ảnh")
    enforce_detection: bool = Field(True, description="Bắt buộc phát hiện khuôn mặt hợp lệ")
    anti_spoofing: bool = Field(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)")
    is_enrollment: bool = Field(False, description="Chế độ nạp ảnh hồ sơ (True: kiểm tra chuẩn ISO/ICAO, False: Kiosk điểm danh)")
    mode: Optional[str] = Field("kiosk", description="Chế độ hoạt động: 'enrollment' hoặc 'kiosk'")


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
    mode: Optional[str] = "kiosk"


@router.post(
    "/face/extract",
    response_model=ExtractionResponse,
    summary="Extract 512-d Face Vector from Uploaded File (UC14 Kiosk Check-in hoặc UC05/UC07 Enrollment)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def extract_face_from_file(
    file: UploadFile = File(..., description="Tệp ảnh nhị phân (.jpg, .png, .webp)"),
    enforce_detection: bool = Form(True, description="Strictly check for face presence"),
    anti_spoofing: bool = Form(False, description="Bật kiểm tra chống giả mạo khuôn mặt (MiniFASNet Liveness)"),
    is_enrollment: bool = Form(False, description="Chế độ nạp ảnh hồ sơ (True: chuẩn ICAO/ISO, False: Kiosk)"),
    mode: Optional[str] = Form("kiosk", description="Chế độ xử lý: 'enrollment' hoặc 'kiosk'")
):
    """
    **Trích xuất đặc trưng khuôn mặt (Universal Face Extraction):**
    - Hỗ trợ cả 2 chế độ:
      + `kiosk` (Mặc định): Độ nét linh hoạt (>= 35.0), tự động áp dụng Primary Face Selection chọn mặt lớn nhất trước quầy.
      + `enrollment`: Độ nét khắt khe (>= 60.0), kiểm tra độ sáng (40-220), chặn tuyệt đối nếu có >= 2 người.
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

    # 2. Trích xuất vector theo chế độ
    t0 = time.time()
    result = deepface_service.extract_embedding(
        cv2_image,
        enforce_detection=enforce_detection,
        anti_spoofing=anti_spoofing,
        is_enrollment=is_enrollment,
        mode=mode
    )
    t_extract = (time.time() - t0) * 1000
    t_total = (time.time() - t_start) * 1000

    logger.info(
        f"⚡ [AI-PROFILE] Mode={result.get('mode')} | Read={t_read:.1f}ms | Decode&Resize={t_decode:.1f}ms | Extract={t_extract:.1f}ms | Total={t_total:.1f}ms"
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result


@router.post(
    "/face/enroll",
    response_model=ExtractionResponse,
    summary="Chuyên biệt: Nạp ảnh khuôn mặt đăng ký hồ sơ Face ID (UC05, UC07, Claim Link)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def enroll_face_from_file(
    file: UploadFile = File(..., description="Tệp ảnh chân dung chính chủ (.jpg, .png, .webp)"),
    enforce_detection: bool = Form(True, description="Bắt buộc phát hiện khuôn mặt hợp lệ"),
    anti_spoofing: bool = Form(True, description="Mặc định BẬT kiểm tra chống giả mạo khi nạp ảnh hồ sơ")
):
    """
    **Quy trình nạp ảnh đăng ký theo tiêu chuẩn khoa học ICAO Doc 9303 & ISO/IEC 29794-5:**
    1. Kiểm tra độ nét (Laplacian variance >= 60.0) -> Chặn ngay nếu mờ (`POOR_QUALITY`).
    2. Kiểm tra độ sáng (40.0 - 220.0) -> Chặn ngay nếu tối/chói (`POOR_LIGHTING`).
    3. Kiểm tra số lượng mặt -> Chặn ngay nếu phát hiện >= 2 người (`MULTIPLE_FACES_DETECTED`).
    4. Kiểm tra kích thước mặt -> Phải >= 100x100px (`FACE_TOO_SMALL`).
    5. Kiểm tra liveness / chống giả mạo bằng MiniFASNet (`SPOOF_DETECTED`).
    6. Trích xuất vector 512-d bằng Facenet512 để lưu trữ vào pgvector.
    """
    return await extract_face_from_file(
        file=file,
        enforce_detection=enforce_detection,
        anti_spoofing=anti_spoofing,
        is_enrollment=True,
        mode="enrollment"
    )


@router.post(
    "/face/extract-base64",
    response_model=ExtractionResponse,
    summary="Extract 512-d Face Vector from Base64 Frame (Kiosk Webcam Canvas UC14)",
    dependencies=[Depends(verify_internal_api_key)]
)
async def extract_face_from_base64(payload: Base64ExtractRequest):
    """
    **Trạm Kiosk Camera Direct Frame (UC14):**
    Nhận chuỗi Base64 chụp trực tiếp từ Canvas Webcam của Frontend Kiosk.
    Hỗ trợ Primary Face Selection và xử lý song song < 300ms.
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
        anti_spoofing=payload.anti_spoofing,
        is_enrollment=payload.is_enrollment,
        mode=payload.mode
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result
