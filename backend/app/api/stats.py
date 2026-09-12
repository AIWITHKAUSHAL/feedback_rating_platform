"""Public platform counters used by the home page hero."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.common import PlatformSummary
from app.services import statistics as service

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=PlatformSummary, summary="Public platform summary")
def platform_summary(db: DbSession) -> PlatformSummary:
    """Total courses, visible reviews, average rating and category count."""
    return service.public_summary(db)
