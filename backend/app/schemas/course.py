"""Course request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.review import ReviewPublic

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]
Mentor = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
Category = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
Duration = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=20, max_length=5000)
]


class CourseWrite(BaseModel):
    """Admin payload for creating and replacing a course."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "FastAPI Production APIs",
                "mentor": "Dr. Neha Verma",
                "category": "Python",
                "duration": "6 weeks",
                "description": "Design, test and ship production FastAPI services backed by PostgreSQL.",
            }
        }
    )

    title: Title
    mentor: Mentor
    category: Category
    duration: Duration
    description: Description


class CourseListItem(BaseModel):
    """One card in the catalogue grid."""

    id: int
    title: str
    slug: str
    mentor: str
    category: str
    duration: str
    short_description: str
    average_rating: float = Field(examples=[4.62])
    review_count: int
    created_at: datetime


class RatingBucket(BaseModel):
    """One bar of the rating distribution chart."""

    rating: int = Field(ge=1, le=5)
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class CourseDetail(BaseModel):
    """Full course payload for the course detail page.

    ``average_rating`` and ``review_count`` count VISIBLE reviews only, so
    hiding a review immediately changes what students see.
    """

    id: int
    title: str
    slug: str
    mentor: str
    category: str
    duration: str
    description: str
    average_rating: float
    review_count: int
    rating_distribution: list[RatingBucket]
    recent_reviews: list[ReviewPublic]
    created_at: datetime
    updated_at: datetime


class CourseAdminItem(BaseModel):
    """Course row in the admin course table - includes moderation counters."""

    id: int
    title: str
    slug: str
    mentor: str
    category: str
    duration: str
    description: str
    average_rating: float
    review_count: int
    hidden_review_count: int
    created_at: datetime
    updated_at: datetime


class CategorySummary(BaseModel):
    """Category filter option with the number of courses in it."""

    category: str
    course_count: int
