"""Course database access.

All SQLAlchemy queries for courses live here; routes and services never build
queries themselves. Aggregates are computed in a single SQL statement per
request (no N+1 loops over reviews).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy import Select, Subquery, and_, func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.review import Review

SortOption = Literal[
    "rating_desc", "rating_asc", "newest", "oldest", "most_reviewed", "title_asc", "title_desc"
]

SORT_OPTIONS: tuple[str, ...] = (
    "rating_desc",
    "rating_asc",
    "newest",
    "oldest",
    "most_reviewed",
    "title_asc",
    "title_desc",
)


@dataclass(frozen=True, slots=True)
class CourseFilters:
    """Catalogue filters coming from the query string."""

    search: str | None = None
    category: str | None = None
    min_rating: float | None = None
    sort: str = "rating_desc"


@dataclass(frozen=True, slots=True)
class CourseStats:
    """A course plus its aggregate rating data."""

    course: Course
    average_rating: float
    review_count: int
    hidden_review_count: int = 0


def _visible_stats_subquery() -> Subquery:
    """Per-course aggregates over VISIBLE reviews only.

    Public averages and review counts deliberately ignore hidden reviews, so
    moderating a review immediately changes what students see.
    """
    return (
        select(
            Review.course_id.label("course_id"),
            func.avg(Review.rating).label("average_rating"),
            func.count(Review.id).label("review_count"),
        )
        .where(Review.is_visible.is_(True))
        .group_by(Review.course_id)
        .subquery("visible_stats")
    )


def _hidden_counts_subquery() -> Subquery:
    """Per-course count of hidden reviews (admin views only)."""
    return (
        select(
            Review.course_id.label("course_id"),
            func.count(Review.id).label("hidden_count"),
        )
        .where(Review.is_visible.is_(False))
        .group_by(Review.course_id)
        .subquery("hidden_stats")
    )


def _apply_filters(stmt: Select, stats: Subquery, filters: CourseFilters) -> Select:
    """Apply search / category / min_rating to a select statement.

    Values are always bound as parameters - no SQL string concatenation.
    """
    if filters.search:
        pattern = f"%{filters.search.strip()}%"
        stmt = stmt.where(
            Course.title.ilike(pattern)
            | Course.mentor.ilike(pattern)
            | Course.category.ilike(pattern)
            | Course.description.ilike(pattern)
        )
    if filters.category:
        stmt = stmt.where(func.lower(Course.category) == filters.category.strip().lower())
    if filters.min_rating is not None:
        stmt = stmt.where(func.coalesce(stats.c.average_rating, 0) >= filters.min_rating)
    return stmt


def _order_by(stmt: Select, stats: Subquery, sort: str) -> Select:
    """Apply a deterministic ordering (id tiebreaker keeps pagination stable)."""
    average = func.coalesce(stats.c.average_rating, 0)
    count = func.coalesce(stats.c.review_count, 0)
    orderings = {
        "rating_desc": (average.desc(), count.desc()),
        "rating_asc": (average.asc(), count.desc()),
        "newest": (Course.created_at.desc(),),
        "oldest": (Course.created_at.asc(),),
        "most_reviewed": (count.desc(), average.desc()),
        "title_asc": (Course.title.asc(),),
        "title_desc": (Course.title.desc(),),
    }
    clauses = orderings.get(sort, orderings["rating_desc"])
    return stmt.order_by(*clauses, Course.id.asc())


def list_courses(
    db: Session, filters: CourseFilters, *, offset: int, limit: int
) -> tuple[list[CourseStats], int]:
    """Return one page of courses with aggregates, plus the filtered total."""
    stats = _visible_stats_subquery()

    count_stmt = _apply_filters(
        select(Course.id).outerjoin(stats, stats.c.course_id == Course.id), stats, filters
    )
    total = db.scalar(select(func.count()).select_from(count_stmt.subquery())) or 0

    data_stmt = _apply_filters(
        select(
            Course,
            func.coalesce(stats.c.average_rating, 0).label("average_rating"),
            func.coalesce(stats.c.review_count, 0).label("review_count"),
        ).outerjoin(stats, stats.c.course_id == Course.id),
        stats,
        filters,
    )
    data_stmt = _order_by(data_stmt, stats, filters.sort).offset(offset).limit(limit)

    rows = db.execute(data_stmt).all()
    items = [
        CourseStats(course=row[0], average_rating=float(row[1]), review_count=int(row[2]))
        for row in rows
    ]
    return items, total


def list_courses_for_admin(
    db: Session, filters: CourseFilters, *, offset: int, limit: int
) -> tuple[list[CourseStats], int]:
    """Same as :func:`list_courses` but also reports hidden review counts."""
    stats = _visible_stats_subquery()
    hidden = _hidden_counts_subquery()

    count_stmt = _apply_filters(
        select(Course.id).outerjoin(stats, stats.c.course_id == Course.id), stats, filters
    )
    total = db.scalar(select(func.count()).select_from(count_stmt.subquery())) or 0

    data_stmt = _apply_filters(
        select(
            Course,
            func.coalesce(stats.c.average_rating, 0).label("average_rating"),
            func.coalesce(stats.c.review_count, 0).label("review_count"),
            func.coalesce(hidden.c.hidden_count, 0).label("hidden_count"),
        )
        .outerjoin(stats, stats.c.course_id == Course.id)
        .outerjoin(hidden, hidden.c.course_id == Course.id),
        stats,
        filters,
    )
    data_stmt = _order_by(data_stmt, stats, filters.sort).offset(offset).limit(limit)

    rows = db.execute(data_stmt).all()
    items = [
        CourseStats(
            course=row[0],
            average_rating=float(row[1]),
            review_count=int(row[2]),
            hidden_review_count=int(row[3]),
        )
        for row in rows
    ]
    return items, total


def get_by_id(db: Session, course_id: int) -> Course | None:
    """Fetch a single course by primary key."""
    return db.get(Course, course_id)


def get_stats_for_course(db: Session, course_id: int) -> tuple[float, int]:
    """Return (average_rating, review_count) over visible reviews."""
    row = db.execute(
        select(
            func.coalesce(func.avg(Review.rating), 0),
            func.count(Review.id),
        ).where(and_(Review.course_id == course_id, Review.is_visible.is_(True)))
    ).one()
    return float(row[0]), int(row[1])


def rating_distribution(db: Session, course_id: int) -> dict[int, int]:
    """Return ``{rating: count}`` for visible reviews, always covering 1-5."""
    rows = db.execute(
        select(Review.rating, func.count(Review.id))
        .where(and_(Review.course_id == course_id, Review.is_visible.is_(True)))
        .group_by(Review.rating)
    ).all()
    counts = dict.fromkeys(range(1, 6), 0)
    for rating, count in rows:
        counts[int(rating)] = int(count)
    return counts


def recent_visible_reviews(db: Session, course_id: int, limit: int) -> list[Review]:
    """Newest visible reviews for a course (bounded - never the full history)."""
    return list(
        db.scalars(
            select(Review)
            .where(and_(Review.course_id == course_id, Review.is_visible.is_(True)))
            .order_by(Review.created_at.desc(), Review.id.desc())
            .limit(limit)
        )
    )


def slug_taken(db: Session, slug: str, *, exclude_id: int | None = None) -> bool:
    """Check whether a slug is already used by another course."""
    stmt = select(Course.id).where(Course.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(Course.id != exclude_id)
    return db.scalar(stmt.limit(1)) is not None


def add(db: Session, course: Course) -> Course:
    """Persist a new course inside the caller's transaction."""
    db.add(course)
    db.flush()
    return course


def list_categories(db: Session) -> list[tuple[str, int]]:
    """Distinct categories with course counts, alphabetically."""
    rows = db.execute(
        select(Course.category, func.count(Course.id))
        .group_by(Course.category)
        .order_by(Course.category.asc())
    ).all()
    return [(str(row[0]), int(row[1])) for row in rows]


def count_all(db: Session) -> int:
    """Total number of courses."""
    return db.scalar(select(func.count(Course.id))) or 0


def count_categories(db: Session) -> int:
    """Number of distinct categories."""
    return db.scalar(select(func.count(func.distinct(Course.category)))) or 0


def top_rated(db: Session, *, min_reviews: int) -> CourseStats | None:
    """Highest rated course with at least ``min_reviews`` visible reviews."""
    stats = _visible_stats_subquery()
    row = db.execute(
        select(
            Course,
            stats.c.average_rating,
            stats.c.review_count,
        )
        .join(stats, stats.c.course_id == Course.id)
        .where(stats.c.review_count >= min_reviews)
        .order_by(stats.c.average_rating.desc(), stats.c.review_count.desc(), Course.id.asc())
        .limit(1)
    ).first()
    if row is None:
        return None
    return CourseStats(course=row[0], average_rating=float(row[1]), review_count=int(row[2]))
