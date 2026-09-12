"""Idempotent seed script.

Run it as often as you like: courses are matched by slug and reviews by
(course, normalized email), so a second run inserts nothing new.

    python -m app.scripts.seed

It never creates tables - run ``alembic upgrade head`` first.
"""

from __future__ import annotations

import logging
import random
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import configure_logging
from app.core.text import normalize_email, slugify
from app.db.session import SessionLocal
from app.models.course import Course
from app.models.review import Review
from app.scripts.seed_data import COURSES, RATING_POOL, REVIEW_TEXTS, STUDENTS

logger = logging.getLogger("app.seed")

# Every fifth course gets one hidden review so review moderation can be
# demonstrated immediately after seeding.
HIDDEN_REVIEW_EVERY = 5


def _seed_courses(db: Session) -> tuple[list[Course], int]:
    """Insert any missing courses. Returns (all courses, number created)."""
    created = 0
    courses: list[Course] = []
    for spec in COURSES:
        slug = slugify(spec["title"])
        course = db.scalar(select(Course).where(Course.slug == slug))
        if course is None:
            course = Course(slug=slug, **spec)
            db.add(course)
            db.flush()
            created += 1
        courses.append(course)
    db.commit()
    return courses, created


def _seed_reviews(db: Session, courses: list[Course]) -> int:
    """Insert deterministic demo reviews for each course."""
    created = 0
    for index, course in enumerate(courses):
        # Seeded on the slug: the same course always gets the same reviews,
        # which is what makes re-running the script a no-op.
        rng = random.Random(f"coursepulse:{course.slug}")
        reviewer_count = rng.randint(4, 9)
        reviewers = rng.sample(STUDENTS, reviewer_count)

        for position, (name, email) in enumerate(reviewers):
            normalized = normalize_email(email)
            already_there = db.scalar(
                select(Review.id).where(
                    Review.course_id == course.id, Review.normalized_email == normalized
                )
            )
            if already_there is not None:
                continue

            rating = rng.choice(RATING_POOL)
            # Hide the last review of every fifth course to seed the
            # moderation queue with something real.
            is_visible = not (index % HIDDEN_REVIEW_EVERY == 0 and position == reviewer_count - 1)
            db.add(
                Review(
                    course_id=course.id,
                    name=name,
                    email=email,
                    normalized_email=normalized,
                    rating=rating,
                    review_text=rng.choice(REVIEW_TEXTS[rating]),
                    is_visible=is_visible,
                )
            )
            created += 1
    db.commit()
    return created


def run() -> int:
    """Seed the database and return the process exit code."""
    configure_logging()
    with SessionLocal() as db:
        courses, courses_created = _seed_courses(db)
        reviews_created = _seed_reviews(db, courses)
        total_reviews = db.scalar(select(Review.id).limit(1))

    logger.info(
        "seed_completed",
        extra={
            "courses_total": len(courses),
            "courses_created": courses_created,
            "reviews_created": reviews_created,
            "had_existing_reviews": total_reviews is not None,
        },
    )
    print(
        f"Seed complete: {len(courses)} courses present "
        f"({courses_created} created), {reviews_created} reviews created."
    )
    return 0


if __name__ == "__main__":
    sys.exit(run())
