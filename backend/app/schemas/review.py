"""Review request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

# Whitespace is stripped before length validation, so "   " is rejected.
StudentName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
ReviewText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=10, max_length=2000)
]
Rating = Annotated[int, Field(ge=1, le=5)]


class ReviewCreate(BaseModel):
    """Payload students submit through the course detail page."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Aditi Sharma",
                "email": "aditi@example.com",
                "rating": 5,
                "review_text": "Clear explanations and genuinely useful hands-on labs.",
            }
        }
    )

    name: StudentName
    email: EmailStr
    rating: Rating
    review_text: ReviewText


class ReviewPublic(BaseModel):
    """A review as shown to students - the email address is never exposed."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    rating: int
    review_text: str
    created_at: datetime


class ReviewAdmin(BaseModel):
    """A review as shown in the moderation dashboard."""

    id: int
    course_id: int
    course_title: str
    name: str
    masked_email: str
    rating: int
    review_text: str
    is_visible: bool
    created_at: datetime


class ReviewVisibilityUpdate(BaseModel):
    """Body of PATCH /api/admin/reviews/{id}/visibility."""

    is_visible: bool
