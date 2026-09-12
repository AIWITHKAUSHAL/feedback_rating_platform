"""Review submission: validation, duplicate protection and aggregate updates."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.review import Review

VALID_PAYLOAD = {
    "name": "Aditi Sharma",
    "email": "aditi@example.com",
    "rating": 5,
    "review_text": "Clear explanations and genuinely useful hands-on labs.",
}


def submit(client: TestClient, course_id: int, **overrides: object) -> object:
    """POST a review, overriding individual fields."""
    payload = {**VALID_PAYLOAD, **overrides}
    return client.post(f"/api/courses/{course_id}/reviews", json=payload)


def test_submit_review_returns_201(client: TestClient, course: Course) -> None:
    response = submit(client, course.id)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Aditi Sharma"
    assert body["rating"] == 5
    assert body["id"] > 0


def test_submit_review_does_not_echo_email(client: TestClient, course: Course) -> None:
    body = submit(client, course.id).json()

    assert "email" not in body


def test_submitted_review_is_persisted_and_visible(
    client: TestClient, course: Course, db: Session
) -> None:
    submit(client, course.id)

    review = db.scalar(select(Review).where(Review.course_id == course.id))
    assert review is not None
    assert review.is_visible is True
    assert review.normalized_email == "aditi@example.com"


def test_submission_updates_average_and_count(client: TestClient, course: Course) -> None:
    before = client.get(f"/api/courses/{course.id}").json()
    assert before["review_count"] == 0

    submit(client, course.id, email="first@example.com", rating=5)
    submit(client, course.id, email="second@example.com", rating=3)

    after = client.get(f"/api/courses/{course.id}").json()
    assert after["review_count"] == 2
    assert after["average_rating"] == 4.0


def test_duplicate_email_is_rejected_with_409(client: TestClient, course: Course) -> None:
    assert submit(client, course.id).status_code == 201

    response = submit(client, course.id)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_REVIEW"


def test_duplicate_detection_ignores_email_case_and_whitespace(
    client: TestClient, course: Course
) -> None:
    submit(client, course.id, email="aditi@example.com")

    response = submit(client, course.id, email="  ADITI@Example.COM  ")

    assert response.status_code == 409


def test_same_email_may_review_a_different_course(
    client: TestClient, course: Course, db: Session
) -> None:
    from tests.conftest import make_course

    other = make_course(db, index=42, title="Another Course", slug="another-course")

    assert submit(client, course.id).status_code == 201
    assert submit(client, other.id).status_code == 201


def test_concurrent_duplicate_submissions_create_only_one_review(
    client: TestClient, course: Course, db: Session
) -> None:
    """The database constraint - not the application check - is the guarantee.

    Two simultaneous submissions from the same email must produce exactly one
    stored review and one 409.
    """

    def send() -> int:
        return submit(client, course.id, email="race@example.com").status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = sorted(pool.map(lambda _: send(), range(2)))

    stored = db.scalars(select(Review).where(Review.course_id == course.id)).all()
    assert len(stored) == 1
    assert statuses[0] == 201
    assert statuses[1] == 409


@pytest.mark.parametrize(
    "email",
    ["not-an-email", "missing@domain", "@example.com", "", "  "],
)
def test_invalid_email_is_rejected_with_422(client: TestClient, course: Course, email: str) -> None:
    response = submit(client, course.id, email=email)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("rating", [0, 6, -1, 99, 2.5, "five", None])
def test_invalid_rating_is_rejected_with_422(
    client: TestClient, course: Course, rating: object
) -> None:
    response = submit(client, course.id, rating=rating)

    assert response.status_code == 422


def test_validation_error_reports_the_offending_field(client: TestClient, course: Course) -> None:
    body = submit(client, course.id, rating=9).json()

    fields = [detail["field"] for detail in body["error"]["details"]]
    assert "rating" in fields


def test_blank_name_is_rejected(client: TestClient, course: Course) -> None:
    response = submit(client, course.id, name="   ")

    assert response.status_code == 422


def test_overlong_name_is_rejected(client: TestClient, course: Course) -> None:
    response = submit(client, course.id, name="A" * 200)

    assert response.status_code == 422


def test_short_review_text_is_rejected(client: TestClient, course: Course) -> None:
    response = submit(client, course.id, review_text="Good")

    assert response.status_code == 422


def test_overlong_review_text_is_rejected(client: TestClient, course: Course) -> None:
    response = submit(client, course.id, review_text="A" * 2500)

    assert response.status_code == 422


def test_whitespace_is_trimmed_before_storage(
    client: TestClient, course: Course, db: Session
) -> None:
    submit(
        client,
        course.id,
        name="  Aditi Sharma  ",
        review_text="   A perfectly acceptable review body.   ",
    )

    review = db.scalar(select(Review).where(Review.course_id == course.id))
    assert review is not None
    assert review.name == "Aditi Sharma"
    assert review.review_text == "A perfectly acceptable review body."


def test_review_for_unknown_course_returns_404(client: TestClient) -> None:
    response = submit(client, 999999)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "COURSE_NOT_FOUND"


def test_unknown_course_is_checked_before_validation_side_effects(
    client: TestClient, db: Session
) -> None:
    submit(client, 999999)

    assert db.scalars(select(Review)).all() == []


def test_oversized_body_is_rejected_with_413(client: TestClient, course: Course) -> None:
    huge = {**VALID_PAYLOAD, "review_text": "A" * 200_000}

    response = client.post(f"/api/courses/{course.id}/reviews", json=huge)

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"
