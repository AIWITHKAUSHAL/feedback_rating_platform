"""Public review submission endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, status

from app.api.deps import DbSession
from app.schemas.common import ErrorResponse
from app.schemas.review import ReviewCreate, ReviewPublic
from app.services import reviews as service

router = APIRouter(prefix="/courses", tags=["reviews"])


@router.post(
    "/{course_id}/reviews",
    response_model=ReviewPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Submit feedback for a course",
    responses={
        404: {"model": ErrorResponse, "description": "Course not found"},
        409: {"model": ErrorResponse, "description": "This email already reviewed this course"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
def create_review(
    db: DbSession, course_id: Annotated[int, Path(ge=1)], payload: ReviewCreate
) -> ReviewPublic:
    """Store one review per email address per course.

    The response never echoes the submitted email address.
    """
    return service.submit_review(db, course_id, payload)
