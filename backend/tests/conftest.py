"""Pytest configuration and shared fixtures.

Tests run against a REAL PostgreSQL database (the same engine production uses)
created by the Alembic migrations, so constraint behaviour - especially the
duplicate-review guard - is genuinely exercised rather than simulated.

The target database comes from ``TEST_DATABASE_URL`` and defaults to the local
Docker instance. A guard below refuses to run against anything that looks like a
managed/production endpoint.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest

# Settings are read at import time, so the test configuration must be in place
# before anything from ``app`` is imported.
DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://coursepulse:coursepulse@localhost:5433/coursepulse_pytest"
)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)

# Refuse to touch anything that is not obviously a throwaway test database.
FORBIDDEN_HOST_MARKERS = ("rds.amazonaws.com", "amazonaws.com")
if any(marker in TEST_DATABASE_URL for marker in FORBIDDEN_HOST_MARKERS):
    raise RuntimeError(
        "TEST_DATABASE_URL points at a managed cloud database. "
        "Tests must only run against a local/disposable PostgreSQL instance."
    )

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-only-secret-not-used-anywhere-else"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ.pop("ADMIN_EMAIL", None)
os.environ.pop("ADMIN_PASSWORD", None)

from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from alembic import command  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.admin_user import AdminUser  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.review import Review  # noqa: E402

ADMIN_EMAIL = "admin@coursepulse.dev"
ADMIN_PASSWORD = "test-admin-password"

TABLES = ("reviews", "courses", "admin_users")


@pytest.fixture(scope="session", autouse=True)
def _migrated_database() -> Iterator[None]:
    """Recreate the schema from the Alembic migrations once per test session."""
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    command.upgrade(config, "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def _clean_tables() -> Iterator[None]:
    """Start every test from an empty database."""
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    """A session for arranging fixtures and asserting on stored rows."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Iterator[TestClient]:
    """HTTP client bound to the real application (real database, real middleware)."""
    with TestClient(app) as test_client:
        yield test_client


# --------------------------------------------------------------------- helpers
def make_course(db: Session, **overrides: object) -> Course:
    """Insert a course with sensible defaults."""
    index = overrides.pop("index", 0)
    defaults: dict[str, object] = {
        "title": f"Test Course {index}",
        "slug": f"test-course-{index}",
        "mentor": "Test Mentor",
        "category": "Python",
        "duration": "4 weeks",
        "description": "A course description long enough to satisfy validation rules.",
    }
    defaults.update(overrides)
    course = Course(**defaults)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def make_review(
    db: Session, course: Course, *, rating: int, email: str, **overrides: object
) -> Review:
    """Insert a review for a course."""
    defaults: dict[str, object] = {
        "name": "Test Student",
        "review_text": "A review body that is comfortably longer than ten characters.",
        "is_visible": True,
    }
    defaults.update(overrides)
    review = Review(
        course_id=course.id,
        email=email,
        normalized_email=email.strip().lower(),
        rating=rating,
        **defaults,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@pytest.fixture
def course(db: Session) -> Course:
    """A single plain course."""
    return make_course(db, index=1, title="FastAPI Production APIs", slug="fastapi-production-apis")


@pytest.fixture
def catalogue(db: Session) -> list[Course]:
    """Three courses across two categories with known ratings.

    Ratings are chosen so every aggregate assertion has an exact expected value:

    * Python course       -> visible 5, 4      => average 4.5, count 2
    * Cloud course        -> visible 3         => average 3.0, count 1
    * DevOps course       -> no visible reviews => average 0.0, count 0
    """
    python_course = make_course(
        db,
        index=1,
        title="FastAPI Production APIs",
        slug="fastapi-production-apis",
        category="Python",
        mentor="Dr. Neha Verma",
    )
    cloud_course = make_course(
        db,
        index=2,
        title="AWS Cloud Foundations",
        slug="aws-cloud-foundations",
        category="Cloud Computing",
        mentor="Rahul Mehta",
    )
    devops_course = make_course(
        db,
        index=3,
        title="Terraform Infrastructure as Code",
        slug="terraform-iac",
        category="DevOps",
        mentor="Arjun Kulkarni",
    )

    make_review(db, python_course, rating=5, email="one@example.com")
    make_review(db, python_course, rating=4, email="two@example.com")
    # Hidden review with an extreme rating: it must not move the public average.
    make_review(db, python_course, rating=1, email="hidden@example.com", is_visible=False)
    make_review(db, cloud_course, rating=3, email="three@example.com")
    return [python_course, cloud_course, devops_course]


@pytest.fixture
def admin(db: Session) -> AdminUser:
    """An active admin account."""
    account = AdminUser(
        email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD), is_active=True
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@pytest.fixture
def admin_token(client: TestClient, admin: AdminUser) -> str:
    """A valid admin bearer token obtained through the real login endpoint."""
    response = client.post(
        "/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token: str) -> dict[str, str]:
    """Authorization header for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}
