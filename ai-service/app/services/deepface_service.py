import time
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from deepface import DeepFace
    try:
        from deepface.modules.exceptions import SpoofDetected
    except ImportError:
        class SpoofDetected(Exception):
            pass
except ImportError:
    DeepFace = None
    class SpoofDetected(Exception):
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
        to eliminate the 3-5s cold-start latency on the first real Kiosk request.
        """
        if self.is_warmed_up:
            return True

        if DeepFace is None:
            logger.warning("Thư viện DeepFace chưa được cài đặt trên môi trường này. Chạy 'pip install -r requirements.txt' hoặc khởi chạy Docker.")
            return False

        logger.info(f"Warming up DeepFace model '{self.model_name}' with detector '{self.detector_backend}'...")
        start_time = time.time()
        
        try:
            # Create a synthetic 224x224 RGB image with an ellipse approximating a face
            dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
            if cv2 is not None:
                cv2.ellipse(dummy_img, (112, 112), (50, 70), 0, 0, 360, (200, 200, 200), -1)
                cv2.circle(dummy_img, (95, 95), 10, (50, 50, 50), -1)   # Left eye
                cv2.circle(dummy_img, (129, 95), 10, (50, 50, 50), -1)  # Right eye
                cv2.ellipse(dummy_img, (112, 140), (20, 10), 0, 0, 180, (50, 50, 50), -1) # Mouth
            
            # Run representation without enforcing strict detection for warm-up
            _ = DeepFace.represent(
                img_path=dummy_img,
                model_name=self.model_name,
                detector_backend="skip",
                enforce_detection=False
            )
            
            duration = round((time.time() - start_time) * 1000, 2)
            self.is_warmed_up = True
            logger.info(f"Model warm-up completed successfully in {duration} ms.")
            return True
        except Exception as e:
            logger.warning(f"Model warm-up encountered non-critical error: {str(e)}. Models will load on first request.")
            return False

    def extract_embedding(
        self,
        cv2_image: np.ndarray,
        enforce_detection: bool = True,
        anti_spoofing: bool = False
    ) -> Dict[str, Any]:
        """
        Trích xuất vector 512 chiều từ khung hình khuôn mặt.
        Phục vụ UC14 (Điểm danh Kiosk) và UC05 (Nạp Face ID hồ sơ).
        """
        start_time = time.time()
        
        # 1. Kiểm tra chất lượng ảnh FIQA (Độ nét & Ánh sáng)
        is_blurry, blur_score = check_image_blur(cv2_image)
        is_too_dark, is_too_bright, brightness_score = check_image_brightness(cv2_image)
        img_info = get_image_info(cv2_image)

        if DeepFace is None:
            return {
                "success": False,
                "error_code": "DEPENDENCY_MISSING",
                "message": "Thư viện 'deepface' chưa được cài đặt. Vui lòng chạy lệnh: pip install -r requirements.txt",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "is_too_dark": is_too_dark,
                "is_too_bright": is_too_bright,
                "brightness_score": brightness_score,
                "execution_time_ms": 0.0
            }

        # 2. Gọi DeepFace để phát hiện và trích xuất vector
        try:
            results = DeepFace.represent(
                img_path=cv2_image,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=enforce_detection,
                align=True,
                anti_spoofing=anti_spoofing
            )
        except SpoofDetected as e:
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
                "execution_time_ms": duration_ms
            }
        except ValueError as e:
            # DeepFace raises ValueError when face could not be detected
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "NO_FACE_DETECTED",
                "message": "Không tìm thấy khuôn mặt hợp lệ trong khung hình. Vui lòng hướng thẳng mặt vào camera.",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms
            }
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "EXTRACTION_FAILED",
                "message": f"Lỗi xử lý trích xuất khuôn mặt: {str(e)}",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms
            }

        # Kiểm tra danh sách kết quả (thường trả về list các khuôn mặt tìm thấy)
        if not results:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "error_code": "NO_FACE_DETECTED",
                "message": "Không phát hiện được khuôn mặt trong khung hình.",
                "embedding": None,
                "dimension": 0,
                "is_blurry": is_blurry,
                "blur_score": blur_score,
                "execution_time_ms": duration_ms
            }

        # Nếu phát hiện nhiều hơn 1 mặt và là ảnh đăng ký hồ sơ, cảnh báo
        multiple_faces = len(results) > 1

        # Lấy khuôn mặt có diện tích hoặc confidence cao nhất
        primary_face = max(results, key=lambda x: x.get("facial_area", {}).get("w", 0) * x.get("facial_area", {}).get("h", 0))
        embedding = primary_face.get("embedding", [])
        facial_area = primary_face.get("facial_area", {})
        face_confidence = primary_face.get("face_confidence", 1.0)

        # Kiểm tra kích thước khuôn mặt có quá nhỏ so với tiêu chuẩn Kiosk không
        face_w = facial_area.get("w", 0)
        face_h = facial_area.get("h", 0)
        is_too_small = face_w < settings.MIN_FACE_WIDTH or face_h < settings.MIN_FACE_HEIGHT

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
            "multiple_faces_detected": multiple_faces,
            "total_faces_count": len(results),
            "is_blurry": is_blurry,
            "blur_score": blur_score,
            "is_too_dark": is_too_dark,
            "is_too_bright": is_too_bright,
            "brightness_score": brightness_score,
            "is_too_small": is_too_small,
            "execution_time_ms": duration_ms
        }

    def verify_two_faces(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
        threshold: Optional[float] = None,
        anti_spoofing: bool = False
    ) -> Dict[str, Any]:
        """
        So khớp trực tiếp 1:1 giữa hai ảnh.
        Dùng cho UC12 (Quầy hỗ trợ Helpdesk đối soát ảnh gốc với người thực tế tại cổng).
        """
        start_time = time.time()
        # Nếu threshold None hoặc <= 0 (do Swagger UI tự điền 0), dùng ngưỡng mặc định từ cấu hình
        if threshold is not None and threshold > 0:
            effective_threshold = threshold
        else:
            effective_threshold = settings.DEFAULT_COSINE_THRESHOLD

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
            
            distance = float(result.get("distance", 1.0))
            is_match = distance <= effective_threshold
            similarity_percent = round(max(0.0, min(100.0, (1.0 - distance) * 100)), 2)
            duration_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "success": True,
                "verified": is_match,
                "is_real": True if anti_spoofing else None,
                "distance": round(distance, 4),
                "threshold_used": effective_threshold,
                "similarity_percent": similarity_percent,
                "model": self.model_name,
                "detector": self.detector_backend,
                "execution_time_ms": duration_ms
            }
        except SpoofDetected as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "verified": False,
                "is_real": False,
                "error_code": "SPOOF_DETECTED",
                "message": "Cảnh báo an ninh: Phát hiện khuôn mặt giả mạo (ảnh từ màn hình điện thoại hoặc giấy in).",
                "distance": 1.0,
                "similarity_percent": 0.0,
                "execution_time_ms": duration_ms
            }
        except ValueError as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "verified": False,
                "error_code": "FACE_NOT_FOUND",
                "message": "Không tìm thấy khuôn mặt trong một hoặc cả hai ảnh cần đối soát.",
                "distance": 1.0,
                "similarity_percent": 0.0,
                "execution_time_ms": duration_ms
            }
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "verified": False,
                "error_code": "VERIFICATION_ERROR",
                "message": f"Lỗi so khớp khuôn mặt: {str(e)}",
                "distance": 1.0,
                "similarity_percent": 0.0,
                "execution_time_ms": duration_ms
            }


deepface_service = DeepFaceService()
