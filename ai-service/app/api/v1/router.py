from fastapi import APIRouter
from app.api.v1.endpoints import health, face_extract, face_verify

api_router = APIRouter()

# Register endpoint routes
api_router.include_router(health.router, tags=["Health & System"])
api_router.include_router(face_extract.router, tags=["Face Extraction (UC14, UC05)"])
api_router.include_router(face_verify.router, tags=["Face Verification 1:1 (UC12)"])
