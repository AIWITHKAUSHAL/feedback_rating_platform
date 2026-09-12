"""Review database access."""

from __future__ import annotations

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.review import Review


def add(db: Session, review: Review) -> Review:
    """Insert a review inside the caller's transaction.

    The flush is what triggers the unique constraint, so the service layer can
    catch IntegrityError and answer with a clean 409.
    """
    db.add(review)
    db.flush()
    return review


def get_by_id(db: Session, review_id: int) -> Review | None:
    return db.get(Review, review_id)


def exists_for_course_and_email(db: Session, course_id: int, normalized_email: str) -> bool:
    """Application-level duplicate check (the database constraint is the guarantee)."""
    stmt = (
        select(Review.id)
        .where(Review.course_id == course_id, Review.normalized_email == normalized_email)
        .limit(1)
    )
    return db.scalar(stmt) is not None


def _admin_list_stmt(course_id: int | None, is_visible: bool | None, search: str | None) -> Select:
    stmt = select(Review, Course.title).join(Course, Course.id == Review.course_id)
    if course_id is not None:
        stmt = stmt.where(Review.course_id == course_id)
    if is_visible is not None:
        stmt = stmt.where(Review.is_visible.is_(is_visible))
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            Review.name.ilike(pattern)
            | Review.review_text.ilike(pattern)
            | Course.title.ilike(pattern)
        )
    return stmt


def list_for_admin(
    db: Session,
    *,
    offset: int,
    limit: int,
    course_id: int | None = None,
    is_visible: bool | None = None,
    search: str | None = None,
) -> tuple[list[tuple[Review, str]], int]:
    """One page of reviews (newest first) joined with their course title."""
    stmt = _admin_list_stmt(course_id, is_visible, search)
    total = (
        db.scalar(select(func.count()).select_from(stmt.with_only_columns(Review.id).subquery()))
        or 0
    )
    rows = db.execute(
        stmt.order_by(Review.created_at.desc(), Review.id.desc()).offset(offset).limit(limit)
    ).all()
    return [(row[0], str(row[1])) for row in rows], total


def get_for_admin(db: Session, review_id: int) -> tuple[Review, str] | None:
    """A single review with its course title."""
    row = db.execute(
        select(Review, Course.title)
        .join(Course, Course.id == Review.course_id)
        .where(Review.id == review_id)
    ).first()
    return (row[0], str(row[1])) if row else None


def count_all(db: Session) -> int:
    return db.scalar(select(func.count(Review.id))) or 0


def count_by_visibility(db: Session, *, is_visible: bool) -> int:
    return db.scalar(select(func.count(Review.id)).where(Review.is_visible.is_(is_visible))) or 0


def average_visible_rating(db: Session) -> float:
    """Mean rating across all visible reviews (0.0 when there are none)."""
    value = db.scalar(
        select(func.coalesce(func.avg(Review.rating), 0)).where(Review.is_visible.is_(True))
    )
    return float(value or 0)
