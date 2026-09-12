"""Liveness and readiness endpoints.

``/health`` is what the ALB target group polls: it must stay cheap and must not
touch the database, otherwise a brief RDS hiccup would make ECS kill healthy
tasks. ``/health/ready`` is the one that verifies PostgreSQL connectivity.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
def health() -> dict[str, str]:
    """Return basic application health."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/health/ready", summary="Readiness probe (checks PostgreSQL)")
def readiness(db: DbSession) -> JSONResponse:
    """Verify the database is reachable without leaking connection details."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("readiness_check_failed", extra={"error_type": type(exc).__name__})
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "unavailable"},
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ready", "database": "connected"},
    )
