"""Review business logic: submission, duplicate protection and moderation."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import DuplicateReviewError, ReviewNotFoundError
from app.core.text import mask_email, normalize_email
from app.models.review import UNIQUE_REVIEW_CONSTRAINT, Review
from app.repositories import reviews as repo
from app.schemas.common import Page
from app.schemas.review import ReviewAdmin, ReviewCreate, ReviewPublic
from app.services.courses import get_course_or_404


def submit_review(db: Session, course_id: int, payload: ReviewCreate) -> ReviewPublic:
    """Store one student review for a course.

    Duplicate protection is layered:

    1. a fast application check that produces a friendly 409, and
    2. the ``uq_reviews_course_id_normalized_email`` constraint, which is the
       actual guarantee - two concurrent requests cannot both insert.
    """
    get_course_or_404(db, course_id)  # 404 before any write
    normalized = normalize_email(str(payload.email))

    if repo.exists_for_course_and_email(db, course_id, normalized):
        raise DuplicateReviewError()

    review = Review(
        course_id=course_id,
        name=payload.name,
        email=str(payload.email).strip(),
        normalized_email=normalized,
        rating=payload.rating,
        review_text=payload.review_text,
        is_visible=True,
    )
    try:
        repo.add(db, review)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Lost the race against a concurrent submission from the same email.
        if UNIQUE_REVIEW_CONSTRAINT in str(exc.orig):
            raise DuplicateReviewError() from exc
        raise
    db.refresh(review)
    return ReviewPublic.model_validate(review)


def _to_admin(review: Review, course_title: str) -> ReviewAdmin:
    return ReviewAdmin(
        id=review.id,
        course_id=review.course_id,
        course_title=course_title,
        name=review.name,
        masked_email=mask_email(review.email),
        rating=review.rating,
        review_text=review.review_text,
        is_visible=review.is_visible,
        created_at=review.created_at,
    )


def list_admin_reviews(
    db: Session,
    *,
    page: int = 1,
    page_size: int | None = None,
    course_id: int | None = None,
    is_visible: bool | None = None,
    search: str | None = None,
) -> Page[ReviewAdmin]:
    """Paginated moderation queue, newest first."""
    size = min(max(page_size or settings.default_page_size, 1), settings.max_page_size)
    offset = (max(page, 1) - 1) * size
    rows, total = repo.list_for_admin(
        db, offset=offset, limit=size, course_id=course_id, is_visible=is_visible, search=search
    )
    return Page[ReviewAdmin](
        items=[_to_admin(review, title) for review, title in rows],
        page=max(page, 1),
        page_size=size,
        total=total,
        pages=(total + size - 1) // size if size else 0,
    )


def get_admin_review(db: Session, review_id: int) -> ReviewAdmin:
    """Single review for the moderation UI."""
    row = repo.get_for_admin(db, review_id)
    if row is None:
        raise ReviewNotFoundError(f"Review {review_id} does not exist.")
    return _to_admin(row[0], row[1])


def set_visibility(db: Session, review_id: int, *, is_visible: bool) -> ReviewAdmin:
    """Hide or unhide a review.

    Public averages and counts are computed from visible reviews at read time,
    so this single flag is all that needs to change.
    """
    review = repo.get_by_id(db, review_id)
    if review is None:
        raise ReviewNotFoundError(f"Review {review_id} does not exist.")
    review.is_visible = is_visible
    db.commit()
    db.refresh(review)
    row = repo.get_for_admin(db, review_id)
    assert row is not None
    return _to_admin(row[0], row[1])
