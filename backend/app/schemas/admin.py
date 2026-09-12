"""Admin statistics schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TopRatedCourse(BaseModel):
    id: int
    title: str
    mentor: str
    category: str
    average_rating: float
    review_count: int


class PlatformStats(BaseModel):
    """GET /api/admin/stats.

    ``average_platform_rating`` is the mean of every VISIBLE review (the same
    population students see). Moderation counters are reported separately so
    admins can still see what has been hidden.
    """

    total_courses: int
    total_reviews: int
    visible_reviews: int
    hidden_reviews: int
    average_platform_rating: float = Field(examples=[4.37])
    top_rated_course: TopRatedCourse | None = None
    min_reviews_for_top_rated: int = Field(
        description="Minimum visible reviews a course needs to qualify as top rated.",
    )
    total_categories: int
