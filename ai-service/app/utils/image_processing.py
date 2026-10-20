import base64
import io
import re
from typing import Tuple
import numpy as np
from PIL import Image
from app.core.config import settings

try:
    import cv2
except ImportError:
    cv2 = None


def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    """
    Convert raw image bytes to an OpenCV BGR numpy array.
    """
    if not image_bytes:
        raise ValueError("Image bytes are empty.")
    
    if cv2 is not None:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is not None:
            return image

    # Fallback using PIL
    try:
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        arr = np.array(pil_image)
        # Convert RGB to BGR for cv2 convention if cv2 available
        if cv2 is not None:
            return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        return arr[:, :, ::-1]  # RGB to BGR via numpy slice
    except Exception as e:
        raise ValueError(f"Unable to decode image bytes: {str(e)}")


def base64_to_cv2(base64_string: str) -> np.ndarray:
    """
    Convert base64 string (with or without 'data:image/...;base64,' prefix) to an OpenCV BGR array.
    Useful for Kiosk camera canvas frame captures.
    """
    if not base64_string:
        raise ValueError("Base64 string is empty.")
    
    # Strip data URL prefix if present (e.g. data:image/jpeg;base64,...)
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]
        
    try:
        decoded_bytes = base64.b64decode(base64_string)
        return bytes_to_cv2(decoded_bytes)
    except Exception as e:
        raise ValueError(f"Invalid Base64 image payload: {str(e)}")


def check_image_blur(cv2_image: np.ndarray) -> Tuple[bool, float]:
    """
    Estimate image blurriness using the Variance of the Laplacian method.
    Returns (is_blurry: bool, score: float).
    Lower scores mean more blurry. Scores > 45 are typically acceptable for Face ID.
    """
    if cv2_image is None or cv2_image.size == 0:
        return True, 0.0

    if cv2 is not None:
        gray = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_blurry = laplacian_var < settings.BLUR_LAPLACIAN_THRESHOLD
        return is_blurry, round(laplacian_var, 2)

    return False, 100.0


def check_image_brightness(cv2_image: np.ndarray) -> Tuple[bool, bool, float]:
    """
    Estimate image illumination / lighting condition.
    Returns (is_too_dark: bool, is_too_bright: bool, brightness_score: float).
    Average grayscale luminance range is [0.0, 255.0].
    """
    if cv2_image is None or cv2_image.size == 0:
        return True, False, 0.0

    if cv2 is not None:
        gray = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
        mean_val = float(np.mean(gray))
        is_too_dark = mean_val < settings.MIN_BRIGHTNESS
        is_too_bright = mean_val > settings.MAX_BRIGHTNESS
        return is_too_dark, is_too_bright, round(mean_val, 2)

    return False, False, 128.0


def get_image_info(cv2_image: np.ndarray) -> dict:
    """
    Extract basic metadata of the image frame.
    """
    if cv2_image is None:
        return {"width": 0, "height": 0, "channels": 0}
        
    height, width = cv2_image.shape[:2]
    channels = cv2_image.shape[2] if len(cv2_image.shape) > 2 else 1
    return {
        "width": width,
        "height": height,
        "channels": channels
    }
