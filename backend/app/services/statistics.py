"""Platform statistics for the public hero section and the admin dashboard."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories import courses as course_repo
from app.repositories import reviews as review_repo
from app.schemas.admin import PlatformStats, TopRatedCourse
from app.schemas.common import PlatformSummary


def public_summary(db: Session) -> PlatformSummary:
    """Counters students see on the home page (visible reviews only)."""
    return PlatformSummary(
        total_courses=course_repo.count_all(db),
        total_reviews=review_repo.count_by_visibility(db, is_visible=True),
        average_rating=round(review_repo.average_visible_rating(db), 2),
        total_categories=course_repo.count_categories(db),
    )


def platform_stats(db: Session) -> PlatformStats:
    """Admin dashboard statistics.

    ``average_platform_rating`` uses visible reviews so it matches the public
    numbers; ``hidden_reviews`` exposes the moderation backlog separately.
    """
    visible = review_repo.count_by_visibility(db, is_visible=True)
    hidden = review_repo.count_by_visibility(db, is_visible=False)
    top = course_repo.top_rated(db, min_reviews=settings.min_reviews_for_top_rated)
    return PlatformStats(
        total_courses=course_repo.count_all(db),
        total_reviews=visible + hidden,
        visible_reviews=visible,
        hidden_reviews=hidden,
        average_platform_rating=round(review_repo.average_visible_rating(db), 2),
        top_rated_course=(
            TopRatedCourse(
                id=top.course.id,
                title=top.course.title,
                mentor=top.course.mentor,
                category=top.course.category,
                average_rating=round(top.average_rating, 2),
                review_count=top.review_count,
            )
            if top
            else None
        ),
        min_reviews_for_top_rated=settings.min_reviews_for_top_rated,
        total_categories=course_repo.count_categories(db),
    )
