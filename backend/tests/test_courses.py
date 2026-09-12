"""Public catalogue and course detail endpoints, including aggregate accuracy."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.course import Course
from tests.conftest import make_course, make_review


def test_list_courses_returns_paginated_envelope(
    client: TestClient, catalogue: list[Course]
) -> None:
    response = client.get("/api/courses")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["pages"] == 1
    assert len(body["items"]) == 3


def test_list_course_item_exposes_card_fields(client: TestClient, catalogue: list[Course]) -> None:
    item = client.get("/api/courses").json()["items"][0]

    expected = {
        "id",
        "title",
        "slug",
        "mentor",
        "category",
        "duration",
        "short_description",
        "average_rating",
        "review_count",
        "created_at",
    }
    assert expected <= set(item)


def test_average_rating_counts_visible_reviews_only(
    client: TestClient, catalogue: list[Course]
) -> None:
    """The Python course has visible 5 and 4 plus a hidden 1 -> average 4.5."""
    items = {item["title"]: item for item in client.get("/api/courses").json()["items"]}

    python_course = items["FastAPI Production APIs"]
    assert python_course["average_rating"] == 4.5
    assert python_course["review_count"] == 2


def test_course_without_reviews_reports_zero(client: TestClient, catalogue: list[Course]) -> None:
    items = {item["title"]: item for item in client.get("/api/courses").json()["items"]}

    devops_course = items["Terraform Infrastructure as Code"]
    assert devops_course["average_rating"] == 0
    assert devops_course["review_count"] == 0


def test_search_matches_title(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get("/api/courses", params={"search": "terraform"}).json()

    assert body["total"] == 1
    assert body["items"][0]["title"] == "Terraform Infrastructure as Code"


def test_search_matches_mentor(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get("/api/courses", params={"search": "Rahul"}).json()

    assert [item["mentor"] for item in body["items"]] == ["Rahul Mehta"]


def test_search_with_no_match_returns_empty_page(
    client: TestClient, catalogue: list[Course]
) -> None:
    body = client.get("/api/courses", params={"search": "quantum basket weaving"}).json()

    assert body["total"] == 0
    assert body["items"] == []


def test_category_filter_is_case_insensitive(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get("/api/courses", params={"category": "cloud computing"}).json()

    assert body["total"] == 1
    assert body["items"][0]["category"] == "Cloud Computing"


def test_min_rating_filter_excludes_lower_rated_courses(
    client: TestClient, catalogue: list[Course]
) -> None:
    body = client.get("/api/courses", params={"min_rating": 4}).json()

    assert [item["title"] for item in body["items"]] == ["FastAPI Production APIs"]


def test_min_rating_filter_can_include_unrated_courses(
    client: TestClient, catalogue: list[Course]
) -> None:
    body = client.get("/api/courses", params={"min_rating": 0}).json()

    assert body["total"] == 3


def test_pagination_splits_results(client: TestClient, db: Session) -> None:
    for index in range(5):
        make_course(db, index=index, title=f"Course {index}", slug=f"course-{index}")

    first = client.get("/api/courses", params={"page": 1, "page_size": 2}).json()
    second = client.get("/api/courses", params={"page": 2, "page_size": 2}).json()

    assert first["total"] == 5
    assert first["pages"] == 3
    assert len(first["items"]) == 2
    assert len(second["items"]) == 2
    first_ids = {item["id"] for item in first["items"]}
    second_ids = {item["id"] for item in second["items"]}
    assert first_ids.isdisjoint(second_ids)


def test_page_size_above_maximum_is_rejected(client: TestClient) -> None:
    response = client.get("/api/courses", params={"page_size": 500})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_sort_rating_desc_orders_by_average(client: TestClient, catalogue: list[Course]) -> None:
    titles = [
        item["title"]
        for item in client.get("/api/courses", params={"sort": "rating_desc"}).json()["items"]
    ]

    assert titles[0] == "FastAPI Production APIs"
    assert titles[-1] == "Terraform Infrastructure as Code"


def test_sort_title_asc_orders_alphabetically(client: TestClient, catalogue: list[Course]) -> None:
    titles = [
        item["title"]
        for item in client.get("/api/courses", params={"sort": "title_asc"}).json()["items"]
    ]

    assert titles == sorted(titles)


def test_sort_most_reviewed_puts_busiest_course_first(
    client: TestClient, catalogue: list[Course]
) -> None:
    items = client.get("/api/courses", params={"sort": "most_reviewed"}).json()["items"]

    assert items[0]["review_count"] == 2


def test_unknown_sort_falls_back_to_default(client: TestClient, catalogue: list[Course]) -> None:
    response = client.get("/api/courses", params={"sort": "not-a-sort"})

    assert response.status_code == 200
    assert response.json()["items"][0]["title"] == "FastAPI Production APIs"


def test_categories_endpoint_returns_counts(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get("/api/courses/categories").json()

    assert {"category": "Cloud Computing", "course_count": 1} in body
    assert len(body) == 3


def test_course_detail_returns_full_payload(client: TestClient, catalogue: list[Course]) -> None:
    course_id = catalogue[0].id

    body = client.get(f"/api/courses/{course_id}").json()

    assert body["id"] == course_id
    assert body["average_rating"] == 4.5
    assert body["review_count"] == 2
    assert len(body["rating_distribution"]) == 5
    assert len(body["recent_reviews"]) == 2


def test_course_detail_hides_reviewer_emails(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get(f"/api/courses/{catalogue[0].id}").json()

    assert "email" not in body["recent_reviews"][0]
    assert "example.com" not in response_text(body)


def response_text(payload: object) -> str:
    """Flatten a payload to text so leak assertions are easy to read."""
    return str(payload)


def test_rating_distribution_percentages_are_accurate(client: TestClient, db: Session) -> None:
    course = make_course(db, index=9, title="Distribution Course", slug="distribution-course")
    for index, rating in enumerate((5, 5, 5, 4)):
        make_review(db, course, rating=rating, email=f"student{index}@example.com")

    buckets = {
        bucket["rating"]: bucket
        for bucket in client.get(f"/api/courses/{course.id}").json()["rating_distribution"]
    }

    assert buckets[5]["count"] == 3
    assert buckets[5]["percentage"] == 75.0
    assert buckets[4]["percentage"] == 25.0
    assert buckets[1]["count"] == 0
    assert buckets[1]["percentage"] == 0.0


def test_hidden_review_is_absent_from_detail_feedback(client: TestClient, db: Session) -> None:
    course = make_course(db, index=10, title="Moderated Course", slug="moderated-course")
    make_review(db, course, rating=5, email="visible@example.com", name="Visible Student")
    make_review(
        db, course, rating=1, email="hidden@example.com", name="Hidden Student", is_visible=False
    )

    body = client.get(f"/api/courses/{course.id}").json()

    names = [review["name"] for review in body["recent_reviews"]]
    assert names == ["Visible Student"]
    assert body["average_rating"] == 5.0


def test_recent_reviews_are_limited_and_newest_first(client: TestClient, db: Session) -> None:
    course = make_course(db, index=11, title="Busy Course", slug="busy-course")
    for index in range(8):
        make_review(db, course, rating=5, email=f"busy{index}@example.com", name=f"Student {index}")

    body = client.get(f"/api/courses/{course.id}").json()

    # settings.recent_reviews_limit caps the payload; never the full history.
    assert len(body["recent_reviews"]) == 5
    assert body["review_count"] == 8
    assert body["recent_reviews"][0]["name"] == "Student 7"


def test_course_detail_returns_404_for_unknown_course(client: TestClient) -> None:
    response = client.get("/api/courses/999999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "COURSE_NOT_FOUND"


def test_public_stats_summary(client: TestClient, catalogue: list[Course]) -> None:
    body = client.get("/api/stats").json()

    assert body["total_courses"] == 3
    assert body["total_reviews"] == 3  # visible only
    assert body["total_categories"] == 3
    assert body["average_rating"] == 4.0  # (5 + 4 + 3) / 3
