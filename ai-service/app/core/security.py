from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_internal_api_key(api_key: str = Security(api_key_header)) -> bool:
    """
    Middleware dependency to secure internal communication between
    ASP.NET Core Backend-Core and FastAPI AI Microservice.
    """
    if not settings.REQUIRE_API_KEY:
        return True

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "MISSING_API_KEY",
                "message": "Header 'X-API-Key' is required for internal service access."
            }
        )

    if api_key != settings.AI_INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_API_KEY",
                "message": "Invalid 'X-API-Key' provided."
            }
        )

    return True
