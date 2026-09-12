"""Public course endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, Query

from app.api.deps import DbSession
from app.core.config import settings
from app.repositories.courses import SORT_OPTIONS
from app.schemas.common import Page
from app.schemas.course import CategorySummary, CourseDetail, CourseListItem
from app.services import courses as service

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=Page[CourseListItem], summary="Browse the course catalogue")
def list_courses(
    db: DbSession,
    page: Annotated[int, Query(ge=1, description="1-based page number")] = 1,
    page_size: Annotated[int | None, Query(ge=1, le=settings.max_page_size)] = None,
    search: Annotated[
        str | None, Query(max_length=120, description="Title, mentor or topic")
    ] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    min_rating: Annotated[float | None, Query(ge=0, le=5)] = None,
    sort: Annotated[str, Query(description=f"One of: {', '.join(SORT_OPTIONS)}")] = "rating_desc",
) -> Page[CourseListItem]:
    """Paginated catalogue with search, category, minimum-rating and sorting.

    Filtering and pagination happen in PostgreSQL - the browser never receives
    the full dataset.
    """
    return service.list_courses(
        db,
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        min_rating=min_rating,
        sort=sort,
    )


# Declared before /{course_id} so the literal path wins the route match.
@router.get("/categories", response_model=list[CategorySummary], summary="Categories with counts")
def list_categories(db: DbSession) -> list[CategorySummary]:
    """Categories available for the catalogue filter."""
    return service.list_categories(db)


@router.get("/{course_id}", response_model=CourseDetail, summary="Course details")
def get_course(db: DbSession, course_id: Annotated[int, Path(ge=1)]) -> CourseDetail:
    """Course details with visible-review aggregates, distribution and feedback."""
    return service.get_course_detail(db, course_id)
