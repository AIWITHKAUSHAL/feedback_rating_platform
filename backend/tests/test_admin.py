"""Admin authentication, course management, moderation and statistics."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.admin_user import AdminUser
from app.models.course import Course
from app.models.review import Review
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, make_course, make_review

COURSE_PAYLOAD = {
    "title": "Kubernetes Operations",
    "mentor": "Priya Nair",
    "category": "DevOps",
    "duration": "6 weeks",
    "description": "Operate containerised workloads safely, from rollout strategy to incident review.",
}

ADMIN_ENDPOINTS = [
    ("get", "/api/admin/stats"),
    ("get", "/api/admin/courses"),
    ("get", "/api/admin/reviews"),
]


# ------------------------------------------------------------- authentication
def test_login_with_valid_credentials_returns_token(client: TestClient, admin: AdminUser) -> None:
    response = client.post(
        "/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] > 0


def test_login_with_wrong_password_returns_401(client: TestClient, admin: AdminUser) -> None:
    response = client.post(
        "/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_FAILED"


def test_login_with_unknown_email_returns_same_generic_error(client: TestClient) -> None:
    response = client.post(
        "/api/admin/auth/login", json={"email": "nobody@example.com", "password": "whatever-123"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_FAILED"


def test_login_for_deactivated_admin_is_refused(
    client: TestClient, admin: AdminUser, db: Session
) -> None:
    stored = db.get(AdminUser, admin.id)
    assert stored is not None
    stored.is_active = False
    db.commit()

    response = client.post(
        "/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )

    assert response.status_code == 401


def test_login_rejects_malformed_payload(client: TestClient) -> None:
    response = client.post("/api/admin/auth/login", json={"email": "nope", "password": "short"})

    assert response.status_code == 422


def test_admin_endpoints_require_a_token(client: TestClient) -> None:
    for method, path in ADMIN_ENDPOINTS:
        response = getattr(client, method)(path)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "INVALID_TOKEN"


def test_admin_endpoint_rejects_a_garbage_token(client: TestClient) -> None:
    response = client.get("/api/admin/stats", headers={"Authorization": "Bearer not.a.jwt"})

    assert response.status_code == 401


def test_admin_endpoint_rejects_an_expired_token(client: TestClient, admin: AdminUser) -> None:
    expired, _ = create_access_token(str(admin.id), expires_minutes=-5)

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401
    assert "expired" in response.json()["error"]["message"].lower()


def test_admin_profile_endpoint_returns_current_admin(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/api/admin/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == ADMIN_EMAIL


# --------------------------------------------------------- course management
def test_admin_can_create_a_course(
    client: TestClient, auth_headers: dict[str, str], db: Session
) -> None:
    response = client.post("/api/admin/courses", json=COURSE_PAYLOAD, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Kubernetes Operations"
    assert body["slug"] == "kubernetes-operations"
    assert body["review_count"] == 0
    assert db.scalar(select(Course).where(Course.slug == "kubernetes-operations")) is not None


def test_created_course_appears_in_the_public_catalogue(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    client.post("/api/admin/courses", json=COURSE_PAYLOAD, headers=auth_headers)

    titles = [item["title"] for item in client.get("/api/courses").json()["items"]]
    assert "Kubernetes Operations" in titles


def test_creating_a_course_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/admin/courses", json=COURSE_PAYLOAD)

    assert response.status_code == 401


def test_course_creation_validates_input(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/admin/courses",
        json={**COURSE_PAYLOAD, "title": "x", "description": "too short"},
        headers=auth_headers,
    )

    assert response.status_code == 422
    fields = {detail["field"] for detail in response.json()["error"]["details"]}
    assert {"title", "description"} <= fields


def test_duplicate_title_gets_a_distinct_slug(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    first = client.post("/api/admin/courses", json=COURSE_PAYLOAD, headers=auth_headers).json()
    second = client.post("/api/admin/courses", json=COURSE_PAYLOAD, headers=auth_headers).json()

    assert first["slug"] == "kubernetes-operations"
    assert second["slug"] == "kubernetes-operations-2"


def test_admin_can_edit_a_course(
    client: TestClient, auth_headers: dict[str, str], course: Course
) -> None:
    payload = {**COURSE_PAYLOAD, "title": "FastAPI Production APIs v2", "duration": "8 weeks"}

    response = client.put(f"/api/admin/courses/{course.id}", json=payload, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "FastAPI Production APIs v2"
    assert body["duration"] == "8 weeks"
    assert body["slug"] == "fastapi-production-apis-v2"


def test_editing_preserves_existing_reviews(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    make_review(db, course, rating=5, email="keepme@example.com")

    client.put(f"/api/admin/courses/{course.id}", json=COURSE_PAYLOAD, headers=auth_headers)

    detail = client.get(f"/api/courses/{course.id}").json()
    assert detail["review_count"] == 1
    assert detail["average_rating"] == 5.0


def test_editing_an_unknown_course_returns_404(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.put("/api/admin/courses/999999", json=COURSE_PAYLOAD, headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "COURSE_NOT_FOUND"


def test_admin_course_list_reports_hidden_counts(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    make_review(db, course, rating=5, email="visible@example.com")
    make_review(db, course, rating=1, email="hidden@example.com", is_visible=False)

    item = client.get("/api/admin/courses", headers=auth_headers).json()["items"][0]

    assert item["review_count"] == 1
    assert item["hidden_review_count"] == 1


def test_admin_can_fetch_a_single_course(
    client: TestClient, auth_headers: dict[str, str], course: Course
) -> None:
    response = client.get(f"/api/admin/courses/{course.id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == course.id


# ------------------------------------------------------------------ moderation
def test_admin_review_list_masks_email_addresses(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    make_review(db, course, rating=4, email="student.one@example.com")

    item = client.get("/api/admin/reviews", headers=auth_headers).json()["items"][0]

    assert item["masked_email"] == "st*********@example.com"
    assert "student.one@example.com" not in str(item)
    assert item["course_title"] == course.title


def test_admin_can_hide_a_review(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    review = make_review(db, course, rating=5, email="hide@example.com")

    response = client.patch(
        f"/api/admin/reviews/{review.id}/visibility",
        json={"is_visible": False},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_visible"] is False


def test_hiding_a_review_removes_it_from_public_aggregates(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    make_review(db, course, rating=5, email="keep@example.com")
    to_hide = make_review(db, course, rating=1, email="hide@example.com")
    assert client.get(f"/api/courses/{course.id}").json()["average_rating"] == 3.0

    client.patch(
        f"/api/admin/reviews/{to_hide.id}/visibility",
        json={"is_visible": False},
        headers=auth_headers,
    )

    detail = client.get(f"/api/courses/{course.id}").json()
    assert detail["average_rating"] == 5.0
    assert detail["review_count"] == 1


def test_admin_can_unhide_a_review(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    review = make_review(db, course, rating=4, email="back@example.com", is_visible=False)
    assert client.get(f"/api/courses/{course.id}").json()["review_count"] == 0

    response = client.patch(
        f"/api/admin/reviews/{review.id}/visibility",
        json={"is_visible": True},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_visible"] is True
    detail = client.get(f"/api/courses/{course.id}").json()
    assert detail["review_count"] == 1
    assert detail["average_rating"] == 4.0


def test_visibility_change_is_persisted(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    review = make_review(db, course, rating=3, email="persist@example.com")

    client.patch(
        f"/api/admin/reviews/{review.id}/visibility",
        json={"is_visible": False},
        headers=auth_headers,
    )

    db.expire_all()
    stored = db.get(Review, review.id)
    assert stored is not None
    assert stored.is_visible is False


def test_moderating_an_unknown_review_returns_404(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.patch(
        "/api/admin/reviews/999999/visibility", json={"is_visible": False}, headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REVIEW_NOT_FOUND"


def test_moderation_requires_authentication(
    client: TestClient, course: Course, db: Session
) -> None:
    review = make_review(db, course, rating=3, email="anon@example.com")

    response = client.patch(
        f"/api/admin/reviews/{review.id}/visibility", json={"is_visible": False}
    )

    assert response.status_code == 401


def test_review_list_can_filter_by_visibility(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    make_review(db, course, rating=5, email="shown@example.com")
    make_review(db, course, rating=2, email="masked@example.com", is_visible=False)

    hidden = client.get(
        "/api/admin/reviews", params={"is_visible": False}, headers=auth_headers
    ).json()

    assert hidden["total"] == 1
    assert hidden["items"][0]["is_visible"] is False


def test_review_list_can_filter_by_course(
    client: TestClient, auth_headers: dict[str, str], db: Session
) -> None:
    first = make_course(db, index=1, title="Course One", slug="course-one")
    second = make_course(db, index=2, title="Course Two", slug="course-two")
    make_review(db, first, rating=5, email="a@example.com")
    make_review(db, second, rating=4, email="b@example.com")

    body = client.get(
        "/api/admin/reviews", params={"course_id": second.id}, headers=auth_headers
    ).json()

    assert body["total"] == 1
    assert body["items"][0]["course_id"] == second.id


def test_single_review_endpoint_returns_detail(
    client: TestClient, auth_headers: dict[str, str], course: Course, db: Session
) -> None:
    review = make_review(db, course, rating=5, email="one@example.com")

    response = client.get(f"/api/admin/reviews/{review.id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == review.id


# ------------------------------------------------------------------ statistics
def test_stats_counts_courses_and_reviews(
    client: TestClient, auth_headers: dict[str, str], catalogue: list[Course]
) -> None:
    body = client.get("/api/admin/stats", headers=auth_headers).json()

    assert body["total_courses"] == 3
    assert body["total_reviews"] == 4  # includes the hidden one
    assert body["visible_reviews"] == 3
    assert body["hidden_reviews"] == 1


def test_stats_average_uses_visible_reviews_only(
    client: TestClient, auth_headers: dict[str, str], catalogue: list[Course]
) -> None:
    body = client.get("/api/admin/stats", headers=auth_headers).json()

    # Visible ratings are 5, 4 and 3; the hidden 1-star must not drag it down.
    assert body["average_platform_rating"] == 4.0


def test_stats_top_rated_course_requires_minimum_reviews(
    client: TestClient, auth_headers: dict[str, str], db: Session
) -> None:
    sparse = make_course(db, index=1, title="Barely Reviewed", slug="barely-reviewed")
    make_review(db, sparse, rating=5, email="single@example.com")

    body = client.get("/api/admin/stats", headers=auth_headers).json()

    assert body["min_reviews_for_top_rated"] == 3
    assert body["top_rated_course"] is None


def test_stats_reports_the_highest_rated_qualifying_course(
    client: TestClient, auth_headers: dict[str, str], db: Session
) -> None:
    best = make_course(db, index=1, title="Best Course", slug="best-course")
    good = make_course(db, index=2, title="Good Course", slug="good-course")
    for index in range(3):
        make_review(db, best, rating=5, email=f"best{index}@example.com")
        make_review(db, good, rating=4, email=f"good{index}@example.com")

    body = client.get("/api/admin/stats", headers=auth_headers).json()

    assert body["top_rated_course"]["title"] == "Best Course"
    assert body["top_rated_course"]["average_rating"] == 5.0
    assert body["top_rated_course"]["review_count"] == 3


def test_stats_on_an_empty_platform_is_safe(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = client.get("/api/admin/stats", headers=auth_headers).json()

    assert body["total_courses"] == 0
    assert body["average_platform_rating"] == 0
    assert body["top_rated_course"] is None


def test_stats_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/admin/stats").status_code == 401
