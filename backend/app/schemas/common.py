"""Shared response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Page[T](BaseModel):
    """Standard paginated envelope used by every list endpoint."""

    items: list[T]
    page: int = Field(ge=1, examples=[1])
    page_size: int = Field(ge=1, examples=[12])
    total: int = Field(ge=0, examples=[25])
    pages: int = Field(ge=0, examples=[3])


class PlatformSummary(BaseModel):
    """Public counters shown in the marketing hero section."""

    total_courses: int
    total_reviews: int
    average_rating: float
    total_categories: int


class ErrorDetail(BaseModel):
    code: str = Field(examples=["DUPLICATE_REVIEW"])
    message: str = Field(examples=["You have already reviewed this course."])
    details: object | None = None


class ErrorResponse(BaseModel):
    """The shape every failed request returns (documented in OpenAPI)."""

    success: bool = False
    error: ErrorDetail
    request_id: str = ""


class MessageResponse(BaseModel):
    success: bool = True
    message: str
