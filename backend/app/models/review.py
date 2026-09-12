"""Review ORM model, including the database-level duplicate guard."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:  # pragma: no cover - typing only
    from app.models.course import Course

# Name referenced by the reviews service when translating IntegrityError into a
# friendly 409 response. Must stay in sync with the migration.
UNIQUE_REVIEW_CONSTRAINT = "uq_reviews_course_id_normalized_email"


class Review(Base):
    """A single piece of student feedback for one course."""

    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    # Lower-cased copy of ``email`` used for the uniqueness guarantee. Stored as
    # a real column (rather than a functional index) so the constraint behaves
    # identically on every supported database.
    normalized_email: Mapped[str] = mapped_column(String(254), nullable=False)
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    review_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    course: Mapped[Course] = relationship(back_populates="reviews")

    __table_args__ = (
        # One review per email address per course - enforced by PostgreSQL, so a
        # race between two concurrent submissions cannot create a duplicate.
        UniqueConstraint("course_id", "normalized_email", name=UNIQUE_REVIEW_CONSTRAINT),
        CheckConstraint("rating >= 1 AND rating <= 5", name="rating_range"),
        Index("ix_reviews_course_id", "course_id"),
        Index("ix_reviews_created_at", "created_at"),
        Index("ix_reviews_is_visible", "is_visible"),
        # Composite index for the hot path: visible reviews of one course,
        # newest first.
        Index(
            "ix_reviews_course_id_is_visible_created_at", "course_id", "is_visible", "created_at"
        ),
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Review id={self.id} course_id={self.course_id} rating={self.rating}>"
