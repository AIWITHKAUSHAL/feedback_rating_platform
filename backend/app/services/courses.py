"""Course business logic: catalogue queries, aggregates and admin writes."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import CourseNotFoundError, DuplicateCourseError
from app.core.text import slugify
from app.models.course import Course
from app.repositories import courses as repo
from app.repositories.courses import CourseFilters, CourseStats
from app.schemas.common import Page
from app.schemas.course import (
    CategorySummary,
    CourseAdminItem,
    CourseDetail,
    CourseListItem,
    CourseWrite,
    RatingBucket,
)
from app.schemas.review import ReviewPublic

SHORT_DESCRIPTION_LENGTH = 165


def _short_description(description: str) -> str:
    """Trim a description for card display without cutting a word in half."""
    text = description.strip()
    if len(text) <= SHORT_DESCRIPTION_LENGTH:
        return text
    clipped = text[:SHORT_DESCRIPTION_LENGTH].rsplit(" ", 1)[0].rstrip(",.;:")
    return f"{clipped}..."


def _to_list_item(row: CourseStats) -> CourseListItem:
    course = row.course
    return CourseListItem(
        id=course.id,
        title=course.title,
        slug=course.slug,
        mentor=course.mentor,
        category=course.category,
        duration=course.duration,
        short_description=_short_description(course.description),
        average_rating=round(row.average_rating, 2),
        review_count=row.review_count,
        created_at=course.created_at,
    )


def _page_bounds(page: int, page_size: int) -> tuple[int, int]:
    size = min(max(page_size, 1), settings.max_page_size)
    return (max(page, 1) - 1) * size, size


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if page_size else 0


def list_courses(
    db: Session,
    *,
    page: int = 1,
    page_size: int | None = None,
    search: str | None = None,
    category: str | None = None,
    min_rating: float | None = None,
    sort: str = "rating_desc",
) -> Page[CourseListItem]:
    """Return a paginated, filtered, sorted page of catalogue cards."""
    offset, size = _page_bounds(page, page_size or settings.default_page_size)
    filters = CourseFilters(search=search, category=category, min_rating=min_rating, sort=sort)
    rows, total = repo.list_courses(db, filters, offset=offset, limit=size)
    return Page[CourseListItem](
        items=[_to_list_item(row) for row in rows],
        page=max(page, 1),
        page_size=size,
        total=total,
        pages=_pages(total, size),
    )


def list_admin_courses(
    db: Session,
    *,
    page: int = 1,
    page_size: int | None = None,
    search: str | None = None,
    category: str | None = None,
    sort: str = "newest",
) -> Page[CourseAdminItem]:
    """Course list for the admin table, including hidden review counts."""
    offset, size = _page_bounds(page, page_size or settings.default_page_size)
    filters = CourseFilters(search=search, category=category, sort=sort)
    rows, total = repo.list_courses_for_admin(db, filters, offset=offset, limit=size)
    items = [
        CourseAdminItem(
            id=row.course.id,
            title=row.course.title,
            slug=row.course.slug,
            mentor=row.course.mentor,
            category=row.course.category,
            duration=row.course.duration,
            description=row.course.description,
            average_rating=round(row.average_rating, 2),
            review_count=row.review_count,
            hidden_review_count=row.hidden_review_count,
            created_at=row.course.created_at,
            updated_at=row.course.updated_at,
        )
        for row in rows
    ]
    return Page[CourseAdminItem](
        items=items, page=max(page, 1), page_size=size, total=total, pages=_pages(total, size)
    )


def get_course_or_404(db: Session, course_id: int) -> Course:
    """Fetch a course or raise the domain 404 error."""
    course = repo.get_by_id(db, course_id)
    if course is None:
        raise CourseNotFoundError(f"Course {course_id} does not exist.")
    return course


def _rating_distribution(counts: dict[int, int], total: int) -> list[RatingBucket]:
    """Build 5..1 buckets with percentages that are safe when total is zero."""
    return [
        RatingBucket(
            rating=rating,
            count=counts[rating],
            percentage=round(counts[rating] / total * 100, 1) if total else 0.0,
        )
        for rating in (5, 4, 3, 2, 1)
    ]


def get_course_detail(db: Session, course_id: int) -> CourseDetail:
    """Full detail payload: course, visible aggregates, distribution, recent feedback."""
    course = get_course_or_404(db, course_id)
    average, count = repo.get_stats_for_course(db, course_id)
    counts = repo.rating_distribution(db, course_id)
    recent = repo.recent_visible_reviews(db, course_id, settings.recent_reviews_limit)
    return CourseDetail(
        id=course.id,
        title=course.title,
        slug=course.slug,
        mentor=course.mentor,
        category=course.category,
        duration=course.duration,
        description=course.description,
        average_rating=round(average, 2),
        review_count=count,
        rating_distribution=_rating_distribution(counts, count),
        recent_reviews=[ReviewPublic.model_validate(review) for review in recent],
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def _unique_slug(db: Session, title: str, *, exclude_id: int | None = None) -> str:
    """Derive a unique slug from a title, appending a counter when needed."""
    base = slugify(title)
    slug = base
    suffix = 2
    while repo.slug_taken(db, slug, exclude_id=exclude_id):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def create_course(db: Session, payload: CourseWrite) -> Course:
    """Create a course. Slug is derived server-side from the title."""
    course = Course(
        title=payload.title,
        slug=_unique_slug(db, payload.title),
        mentor=payload.mentor,
        category=payload.category,
        duration=payload.duration,
        description=payload.description,
    )
    try:
        repo.add(db, course)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateCourseError() from exc
    db.refresh(course)
    return course


def replace_course(db: Session, course_id: int, payload: CourseWrite) -> Course:
    """Replace the editable fields of an existing course (PUT semantics)."""
    course = get_course_or_404(db, course_id)
    course.title = payload.title
    course.mentor = payload.mentor
    course.category = payload.category
    course.duration = payload.duration
    course.description = payload.description
    # Keep the slug aligned with the title, but never collide with another course.
    course.slug = _unique_slug(db, payload.title, exclude_id=course.id)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateCourseError() from exc
    db.refresh(course)
    return course


def course_to_admin_item(db: Session, course: Course) -> CourseAdminItem:
    """Build the admin representation of one course (used after create/update)."""
    average, count = repo.get_stats_for_course(db, course.id)
    hidden = len([review for review in course.reviews if not review.is_visible])
    return CourseAdminItem(
        id=course.id,
        title=course.title,
        slug=course.slug,
        mentor=course.mentor,
        category=course.category,
        duration=course.duration,
        description=course.description,
        average_rating=round(average, 2),
        review_count=count,
        hidden_review_count=hidden,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def list_categories(db: Session) -> list[CategorySummary]:
    """Categories available in the catalogue, for the filter dropdown."""
    return [
        CategorySummary(category=category, course_count=count)
        for category, count in repo.list_categories(db)
    ]
