"""
Test script for EventPass AI Microservice (UC14 & UC05).
Run with: python test_ai_service.py
"""

import sys
import os
import time
import base64
from pathlib import Path

# Add current dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def test_config():
    print("=== [1] Testing Configuration ===")
    from app.core.config import settings
    print(f"  Project Name: {settings.PROJECT_NAME}")
    print(f"  Model Name: {settings.MODEL_NAME}")
    print(f"  Detector: {settings.DETECTOR_BACKEND}")
    print(f"  Vector Dimension: {settings.VECTOR_DIMENSION}-d")
    print(f"  Internal API Key: {settings.AI_INTERNAL_API_KEY[:8]}***")
    assert settings.VECTOR_DIMENSION == 512, "Vector dimension must be 512 for PostgreSQL pgvector"
    print("  -> Configuration Loaded Successfully!\n")

def test_image_utils():
    print("=== [2] Testing Image Processing Utilities ===")
    import numpy as np
    from PIL import Image
    import io
    from app.utils.image_processing import bytes_to_cv2, base64_to_cv2, check_image_blur, get_image_info

    # 1. Create a dummy synthetic image (200x200 RGB via PIL)
    pil_img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    raw_bytes = buf.getvalue()

    # Test bytes_to_cv2
    decoded_img = bytes_to_cv2(raw_bytes)
    assert decoded_img.shape == (200, 200, 3), "Shape mismatch in bytes_to_cv2"
    print("  -> bytes_to_cv2 OK")

    # Test base64_to_cv2
    b64_str = "data:image/jpeg;base64," + base64.b64encode(raw_bytes).decode("utf-8")
    decoded_b64 = base64_to_cv2(b64_str)
    assert decoded_b64.shape == (200, 200, 3), "Shape mismatch in base64_to_cv2"
    print("  -> base64_to_cv2 OK")

    # Test blur detection
    is_blurry, blur_score = check_image_blur(decoded_img)
    info = get_image_info(decoded_img)
    print(f"  -> Blur Detection: Score={blur_score}, IsBlurry={is_blurry}")
    print(f"  -> Image Info: {info}")
    print("  -> Image Utilities Passed!\n")

def test_fastapi_routes():
    print("=== [3] Testing FastAPI Routing & App Initialization ===")
    from app.main import app

    openapi_schema = app.openapi()
    paths = list(openapi_schema["paths"].keys())
    
    expected_routes = [
        "/",
        "/api/v1/health",
        "/api/v1/face/extract",
        "/api/v1/face/extract-base64",
        "/api/v1/face/verify",
        "/api/v1/face/verify-base64",
    ]
    for r in expected_routes:
        assert r in paths, f"Route {r} not found in FastAPI OpenAPI schema"
        print(f"  -> Route Verified: {r}")
    print("  -> All 6 Core Endpoints Registered Successfully in OpenAPI Schema!\n")

if __name__ == "__main__":
    print("\n" + "="*50)
    print("🎫 EVENTPASS AI SERVICE - UNIT VERIFICATION")
    print("="*50 + "\n")
    try:
        test_config()
        test_image_utils()
        test_fastapi_routes()
        print("="*50)
        print("✅ ALL TESTS PASSED! AI SERVICE IS READY TO RUN.")
        print("="*50 + "\n")
    except Exception as e:
        print(f"\n❌ Test Failed: {str(e)}")
        sys.exit(1)
