import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from deepface import DeepFace
    try:
        from deepface.modules.exceptions import SpoofDetected, FaceNotDetected
    except ImportError:
        class SpoofDetected(Exception):
            pass
        class FaceNotDetected(Exception):
            pass
except ImportError:
    DeepFace = None
    class SpoofDetected(Exception):
        pass
    class FaceNotDetected(Exception):
        pass

from app.core.config import settings
from app.utils.image_processing import check_image_blur, check_image_brightness, get_image_info

logger = logging.getLogger("eventpass.ai.service")


class DeepFaceService:
    def __init__(self):
        self.model_name = settings.MODEL_NAME
        self.detector_backend = settings.DETECTOR_BACKEND
        self.distance_metric = settings.DISTANCE_METRIC
        self.is_warmed_up = False

    def warm_up(self) -> bool:
        """
        Pre-load weights and initialize the neural network graph in memory
        to eliminate the cold-start latency on the first real Kiosk request.
        """
        if DeepFace is None:
            logger.warning("DeepFace is not installed. Skipping warm-up.")
            return False

        try:
            start_time = time.time()
            logger.info(f"Warming up DeepFace model '{self.model_name}' with detector '{self.detector_backend}'...")
            
            # Tạo ảnh dummy 224x224 mô phỏng mặt để warm-up
            dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
            cv2.circle(dummy_img, (112, 112), 60, (200, 200, 200), -1)
            cv2.circle(dummy_img, (90, 95), 10, (50, 50, 50), -1)
            cv2.circle(dummy_img, (134, 95), 10, (50, 50, 50), -1)
            cv2.ellipse(dummy_img, (112, 140), (25, 12), 0, 0, 180, (50, 50, 50), 3)

            DeepFace.represent(
                img_path=dummy_img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=False,
                anti_spoofing=False
            )
            
            self.is_warmed_up = True
            duration = round((time.time() - start_time) * 1000, 2)
            logger.info(f"Model warm-up completed successfully in {duration} ms.")
            return True
        except Exception as e:
            logger.warning(f"Model warm-up encountered non-critical error: {str(e)}. Models will load on first request.")
            return False

    def extract_embedding(
        self,
        cv2_image: np.ndarray,
        enforce_detection: bool = True,
        anti_spoofing: bool = False,
        is_enrollment: bool = False,
        mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trích xuất vector 512 chiều từ khung hình khuôn mặt theo chuẩn khoa học:
        - Enrollment Mode (is_enrollment=True hoặc mode='enrollment'):
          + Kiểm tra ánh sáng khắt khe (40.0 <= brightness <= 220.0) -> Nếu vi phạm chặn ngay với POOR_LIGHTING.
          + Kiểm tra độ nét khắt khe (Laplacian variance >= 60.0 theo chuẩn ICAO Doc 9303 & ISO/IEC 29794-5) -> Nếu < 60.0 chặn ngay với POOR_QUALITY.
          + Chặn tuyệt đối nếu khung hình có >= 2 khuôn mặt (MULTIPLE_FACES_DETECTED), không tự ý chọn mặt đại diện để tránh nạp sai người chính chủ.
          + Yêu cầu kích thước khuôn mặt >= 100x100px (FACE_TOO_SMALL).
        - Kiosk Mode (is_enrollment=False hoặc mode='kiosk'):
          + Độ nét linh hoạt (Laplacian variance >= 35.0) để bù trừ rung lắc khi người đi bộ tới gần quầy.
          + Cơ chế Primary Face Selection: Khi phát hiện >= 2 khuôn mặt, tự động chọn khuôn mặt có bounding box lớn nhất (người đứng sát kiosk),
            bỏ qua đám đông qua lại ở hậu cảnh, đảm bảo luồng check-in không bị tắc nghẽn.
          + Tối ưu đa luồng chạy song song Facenet512 và Anti-spoofing < 300ms.
        """
        start_time = time.time()
        
        # 0. Xác định chế độ hoạt động
        enrollment_mode = bool(is_enrollment or (mode and mode.lower() == "enrollment"))
        active_mode = "enrollment" if enrollment_mode else "kiosk"

        # Thiết lập ngưỡng phân định
        if enrollment_mode:
            blur_threshold = settings.ENROLL_BLUR_THRESHOLD
            min_face_w = settings.ENROLL_MIN_FACE_WIDTH
            min_face_h = settings.ENROLL_MIN_FACE_HEIGHT
            min_brightness = settings.ENROLL_MIN_BRIGHTNESS
            max_brightness = settings.ENROLL_MAX_BRIGHTNESS
        else:
            blur_threshold = settings.KIOSK_BLUR_THRESHOLD
            min_face_w = settings.KIOSK_MIN_FACE_WIDTH
            min_face_h = settings.KIOSK_MIN_FACE_HEIGHT
            min_brightness = settings.KIOSK_MIN_BRIGHTNESS
            max_brightness = settings.KIOSK_MAX_BRIGHTNESS

        # 1. BƯỚC 1: KIỂM TRA ĐỘ SÁNG (FIQA Illumination Check)
        is_too_dark, is_too_bright, brightness_score = check_image_brightness(
            cv2_image, min_b=min_brightness, max_b=max_brightness
        )

        # 2. BƯỚC 2: KIỂM TRA ĐỘ NÉT (FIQA Blur Check - Variance of Laplacian)
        is_blurry, blur_score = check_image_blur(cv2_image, threshold=blur_threshold)

        if DeepFace is None:
            return {
                "success": False,
                "error_code": "DEPENDENCY_MISSING",
                "message": "Thư viện 'deepface' chưa được cài đặt. Vui lòng cài đặt requirements.txt",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "is_too_dark": is_too_dark,
                "is_too_bright": is_too_bright,
                "brightness_score": brightness_score,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "mode": active_mode
            }

        # NẾU Ở CHẾ ĐỘ ENROLLMENT: Thẩm định chất lượng quang học (Ánh sáng -> Độ nét) trước khi chạy AI nặng
        if enrollment_mode:
            if is_too_dark:
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "error_code": "POOR_LIGHTING",
                    "message": f"Ảnh quá tối (độ sáng: {brightness_score:.1f} < {min_brightness:.1f}). Vui lòng chụp ở khu vực có đủ ánh sáng.",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": False,
                    "is_blurry": is_blurry,
                    "blur_score": blur_score,
                    "is_too_dark": True,
                    "is_too_bright": False,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }
            if is_too_bright:
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "error_code": "POOR_LIGHTING",
                    "message": f"Ảnh bị chói lóa hoặc lóa đèn (độ sáng: {brightness_score:.1f} > {max_brightness:.1f}). Vui lòng chụp lại không bị chói.",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": False,
                    "is_blurry": is_blurry,
                    "blur_score": blur_score,
                    "is_too_dark": False,
                    "is_too_bright": True,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }
            if is_blurry:
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "error_code": "POOR_QUALITY",
                    "message": f"Ảnh bị mờ hoặc rung lắc (độ nét: {blur_score:.1f}/{blur_threshold:.1f}). Vui lòng chụp lại ảnh rõ nét hơn.",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": False,
                    "is_blurry": True,
                    "blur_score": blur_score,
                    "is_too_dark": is_too_dark,
                    "is_too_bright": is_too_bright,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }
        else:
            # Ở chế độ Kiosk: nếu khung hình bị mờ nghiêm trọng (< 35.0), chặn ngay
            if is_blurry:
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "error_code": "POOR_QUALITY",
                    "message": f"Khung hình bị mờ hoặc chuyển động quá nhanh (độ nét: {blur_score:.1f}/{blur_threshold:.1f}). Vui lòng đứng yên trước camera.",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": False,
                    "is_blurry": True,
                    "blur_score": blur_score,
                    "is_too_dark": is_too_dark,
                    "is_too_bright": is_too_bright,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }

        # 3. BƯỚC 3 & 4: PHÁT HIỆN KHUÔN MẶT, CHỐNG GIẢ MẠO & TRÍCH XUẤT ĐẶC TRƯNG
        try:
            if anti_spoofing:
                def _task_represent():
                    return DeepFace.represent(
                        img_path=cv2_image,
                        model_name=self.model_name,
                        detector_backend=self.detector_backend,
                        enforce_detection=enforce_detection,
                        align=True,
                        anti_spoofing=False
                    )

                def _task_spoof():
                    return DeepFace.extract_faces(
                        img_path=cv2_image,
                        detector_backend=self.detector_backend,
                        enforce_detection=enforce_detection,
                        align=True,
                        anti_spoofing=True
                    )

                with ThreadPoolExecutor(max_workers=2) as executor:
                    fut_rep = executor.submit(_task_represent)
                    fut_spf = executor.submit(_task_spoof)

                    spoof_faces = fut_spf.result()
                    results = fut_rep.result()

            else:
                results = DeepFace.represent(
                    img_path=cv2_image,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=enforce_detection,
                    align=True,
                    anti_spoofing=False
                )

        except SpoofDetected:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "SPOOF_DETECTED",
                "message": "Cảnh báo an ninh: Phát hiện hành vi giả mạo khuôn mặt (ảnh chụp màn hình điện thoại hoặc giấy in). Vui lòng người thật đứng trước camera.",
                "embedding": None,
                "dimension": 0,
                "face_detected": True,
                "is_real": False,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "is_too_dark": is_too_dark,
                "is_too_bright": is_too_bright,
                "brightness_score": brightness_score,
                "execution_time_ms": duration_ms,
                "mode": active_mode
            }
        except (ValueError, Exception) as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            err_str = str(e)
            if "SpoofDetected" in str(type(e)) or "SpoofDetected" in err_str:
                return {
                    "success": False,
                    "error_code": "SPOOF_DETECTED",
                    "message": "Cảnh báo an ninh: Phát hiện hành vi giả mạo khuôn mặt (ảnh chụp màn hình điện thoại hoặc giấy in).",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": True,
                    "is_real": False,
                    "is_blurry": is_blurry,
                    "blur_score": blur_score,
                    "is_too_dark": is_too_dark,
                    "is_too_bright": is_too_bright,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }
            if "Face could not be detected" in err_str or "FaceNotDetected" in str(type(e)) or isinstance(e, ValueError):
                return {
                    "success": False,
                    "error_code": "NO_FACE_DETECTED",
                    "message": "Không tìm thấy khuôn mặt hợp lệ trong khung hình. Vui lòng hướng thẳng mặt vào camera.",
                    "embedding": None,
                    "dimension": 0,
                    "face_detected": False,
                    "is_blurry": is_blurry,
                    "blur_score": blur_score,
                    "is_too_dark": is_too_dark,
                    "is_too_bright": is_too_bright,
                    "brightness_score": brightness_score,
                    "execution_time_ms": duration_ms,
                    "mode": active_mode
                }
            return {
                "success": False,
                "error_code": "EXTRACTION_FAILED",
                "message": f"Lỗi xử lý trích xuất khuôn mặt: {err_str}",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms,
                "mode": active_mode
            }

        if not results:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "NO_FACE_DETECTED",
                "message": "Không phát hiện được khuôn mặt trong khung hình.",
                "embedding": None,
                "dimension": 0,
                "face_detected": False,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms,
                "mode": active_mode
            }

        faces_count = len(results)

        # 4. BƯỚC 5: KIỂM SOÁT SỐ LƯỢNG MẶT THEO CHẾ ĐỘ
        if enrollment_mode and faces_count > 1:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "MULTIPLE_FACES_DETECTED",
                "message": f"Phát hiện {faces_count} người trong khung hình. Vui lòng chỉ chụp duy nhất 1 người chính chủ.",
                "embedding": None,
                "dimension": 0,
                "face_detected": True,
                "multiple_faces_detected": True,
                "total_faces_count": faces_count,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "is_too_dark": is_too_dark,
                "is_too_bright": is_too_bright,
                "brightness_score": brightness_score,
                "execution_time_ms": duration_ms,
                "mode": active_mode
            }

        # Nếu ở Kiosk mode hoặc chỉ có 1 mặt:
        # Áp dụng cơ chế Primary Face Selection: chọn khuôn mặt có bounding box lớn nhất (người đứng sát camera quầy)
        primary_face = max(
            results,
            key=lambda x: x.get("facial_area", {}).get("w", 0) * x.get("facial_area", {}).get("h", 0)
        )
        facial_area = primary_face.get("facial_area", {})
        embedding = primary_face.get("embedding", [])
        face_confidence = primary_face.get("face_confidence", 1.0)

        face_w = facial_area.get("w", 0)
        face_h = facial_area.get("h", 0)
        is_too_small = face_w < min_face_w or face_h < min_face_h

        # 5. BƯỚC 6: KIỂM TRA KÍCH THƯỚC KHUÔN MẶT
        if is_too_small:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "FACE_TOO_SMALL",
                "message": f"Khuôn mặt quá nhỏ ({face_w}x{face_h}px < {min_face_w}x{min_face_h}px) hoặc đứng quá xa camera. Vui lòng lại gần hơn.",
                "embedding": None,
                "dimension": 0,
                "face_detected": True,
                "facial_area": facial_area,
                "is_too_small": True,
                "multiple_faces_detected": (faces_count > 1),
                "total_faces_count": faces_count,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms,
                "mode": active_mode
            }

        duration_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": True,
            "error_code": None,
            "message": "Trích xuất vector khuôn mặt thành công.",
            "embedding": embedding,
            "dimension": len(embedding),
            "face_detected": True,
            "is_real": True if anti_spoofing else None,
            "face_confidence": round(float(face_confidence), 4),
            "facial_area": facial_area,
            "multiple_faces_detected": (faces_count > 1),
            "total_faces_count": faces_count,
            "is_blurry": is_blurry,
            "blur_score": blur_score,
            "is_too_dark": is_too_dark,
            "is_too_bright": is_too_bright,
            "brightness_score": brightness_score,
            "is_too_small": False,
            "execution_time_ms": duration_ms,
            "mode": active_mode
        }

    def verify_two_faces(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
        threshold: Optional[float] = None,
        anti_spoofing: bool = False
    ) -> Dict[str, Any]:
        """
        So khớp đối soát khuôn mặt 1:1 giữa hai bức ảnh.
        Phục vụ UC12 (Quầy hỗ trợ giải quyết sự cố / ngoại lệ).
        """
        start_time = time.time()
        applied_threshold = threshold if threshold is not None else settings.DEFAULT_COSINE_THRESHOLD

        if DeepFace is None:
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": applied_threshold,
                "similarity_score": 0.0,
                "message": "Thư viện 'deepface' chưa được cài đặt."
            }

        try:
            result = DeepFace.verify(
                img1_path=img1,
                img2_path=img2,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                distance_metric=self.distance_metric,
                enforce_detection=True,
                align=True,
                anti_spoofing=anti_spoofing
            )

            distance = round(float(result.get("distance", 1.0)), 4)
            verified = distance <= applied_threshold
            similarity_score = round(max(0.0, (1.0 - distance)) * 100, 2)
            duration_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "verified": verified,
                "distance": distance,
                "threshold": applied_threshold,
                "similarity_score": similarity_score,
                "model": self.model_name,
                "detector": self.detector_backend,
                "execution_time_ms": duration_ms,
                "message": "Xác thực danh tính thành công." if verified else "Khuôn mặt không trùng khớp."
            }
        except SpoofDetected:
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": applied_threshold,
                "similarity_score": 0.0,
                "message": "Phát hiện giả mạo khuôn mặt ở một trong hai ảnh đối soát."
            }
        except Exception as e:
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": applied_threshold,
                "similarity_score": 0.0,
                "message": f"Lỗi so khớp khuôn mặt: {str(e)}"
            }


deepface_service = DeepFaceService()
