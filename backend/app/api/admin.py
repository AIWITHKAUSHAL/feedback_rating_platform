"""Protected admin endpoints: course management, moderation and statistics.

Every route in this router requires a valid admin bearer token; the dependency
is declared once on the router so a new endpoint cannot accidentally be public.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.deps import DbSession, get_current_admin
from app.core.config import settings
from app.schemas.admin import PlatformStats
from app.schemas.common import ErrorResponse, Page
from app.schemas.course import CourseAdminItem, CourseWrite
from app.schemas.review import ReviewAdmin, ReviewVisibilityUpdate
from app.services import courses as course_service
from app.services import reviews as review_service
from app.services import statistics as stats_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
    responses={401: {"model": ErrorResponse, "description": "Missing or invalid admin token"}},
)


# ----------------------------------------------------------------- statistics
@router.get("/stats", response_model=PlatformStats, summary="Platform statistics")
def get_stats(db: DbSession) -> PlatformStats:
    """Course/review counters, platform average and the top rated course."""
    return stats_service.platform_stats(db)


# ------------------------------------------------------------------- courses
@router.get("/courses", response_model=Page[CourseAdminItem], summary="List courses")
def list_courses(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int | None, Query(ge=1, le=settings.max_page_size)] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    sort: str = "newest",
) -> Page[CourseAdminItem]:
    """Course table for the admin UI, including hidden review counts."""
    return course_service.list_admin_courses(
        db, page=page, page_size=page_size, search=search, category=category, sort=sort
    )


@router.get("/courses/{course_id}", response_model=CourseAdminItem, summary="Get one course")
def get_course(db: DbSession, course_id: Annotated[int, Path(ge=1)]) -> CourseAdminItem:
    """Single course, used to populate the edit form."""
    course = course_service.get_course_or_404(db, course_id)
    return course_service.course_to_admin_item(db, course)


@router.post(
    "/courses",
    response_model=CourseAdminItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a course",
    responses={409: {"model": ErrorResponse, "description": "Duplicate course"}},
)
def create_course(db: DbSession, payload: CourseWrite) -> CourseAdminItem:
    """Create a course. The slug is generated from the title server-side."""
    course = course_service.create_course(db, payload)
    return course_service.course_to_admin_item(db, course)


@router.put(
    "/courses/{course_id}",
    response_model=CourseAdminItem,
    summary="Edit a course",
    responses={404: {"model": ErrorResponse, "description": "Course not found"}},
)
def update_course(
    db: DbSession, course_id: Annotated[int, Path(ge=1)], payload: CourseWrite
) -> CourseAdminItem:
    """Replace the editable fields of a course."""
    course = course_service.replace_course(db, course_id, payload)
    return course_service.course_to_admin_item(db, course)


# ------------------------------------------------------------------- reviews
@router.get("/reviews", response_model=Page[ReviewAdmin], summary="Moderation queue")
def list_reviews(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int | None, Query(ge=1, le=settings.max_page_size)] = None,
    course_id: Annotated[int | None, Query(ge=1)] = None,
    is_visible: Annotated[bool | None, Query(description="Filter by visibility")] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
) -> Page[ReviewAdmin]:
    """Submitted reviews, newest first, with partially masked email addresses."""
    return review_service.list_admin_reviews(
        db,
        page=page,
        page_size=page_size,
        course_id=course_id,
        is_visible=is_visible,
        search=search,
    )


@router.get("/reviews/{review_id}", response_model=ReviewAdmin, summary="Get one review")
def get_review(db: DbSession, review_id: Annotated[int, Path(ge=1)]) -> ReviewAdmin:
    """Single review detail for moderation."""
    return review_service.get_admin_review(db, review_id)


@router.patch(
    "/reviews/{review_id}/visibility",
    response_model=ReviewAdmin,
    summary="Hide or unhide a review",
    responses={404: {"model": ErrorResponse, "description": "Review not found"}},
)
def update_visibility(
    db: DbSession, review_id: Annotated[int, Path(ge=1)], payload: ReviewVisibilityUpdate
) -> ReviewAdmin:
    """Toggle a review's visibility.

    Hiding a review removes it from the public course page and from the public
    average and review count immediately.
    """
    return review_service.set_visibility(db, review_id, is_visible=payload.is_visible)
