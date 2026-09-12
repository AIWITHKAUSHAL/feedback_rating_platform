"""Initial CoursePulse schema: courses, reviews and admin users.

Creates the three tables plus the constraints and indexes the application
depends on. The most important one is
``uq_reviews_course_id_normalized_email``: it is what makes
"one review per email per course" a guarantee rather than a best effort, even
when two requests arrive at the same instant.

Revision ID: e1e74e8a8125
Revises:
Create Date: 2026-09-12 18:38:29.308482
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1e74e8a8125"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_users")),
        sa.UniqueConstraint("email", name=op.f("uq_admin_users_email")),
    )

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("mentor", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("duration", sa.String(length=60), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_courses")),
        # Unique slug gives the catalogue stable, shareable URLs.
        sa.UniqueConstraint("slug", name=op.f("uq_courses_slug")),
    )
    op.create_index("ix_courses_category", "courses", ["category"])
    op.create_index("ix_courses_created_at", "courses", ["created_at"])

    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("normalized_email", sa.String(length=254), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("review_text", sa.Text(), nullable=False),
        sa.Column("is_visible", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        # Ratings outside 1-5 can never be stored, whatever the caller sends.
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name=op.f("ck_reviews_rating_range")),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            name=op.f("fk_reviews_course_id_courses"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
        # Database-level duplicate-review protection.
        sa.UniqueConstraint(
            "course_id", "normalized_email", name="uq_reviews_course_id_normalized_email"
        ),
    )
    op.create_index("ix_reviews_course_id", "reviews", ["course_id"])
    op.create_index("ix_reviews_created_at", "reviews", ["created_at"])
    op.create_index("ix_reviews_is_visible", "reviews", ["is_visible"])
    # Covers the hot path: visible reviews for one course, newest first.
    op.create_index(
        "ix_reviews_course_id_is_visible_created_at",
        "reviews",
        ["course_id", "is_visible", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_reviews_course_id_is_visible_created_at", table_name="reviews")
    op.drop_index("ix_reviews_is_visible", table_name="reviews")
    op.drop_index("ix_reviews_created_at", table_name="reviews")
    op.drop_index("ix_reviews_course_id", table_name="reviews")
    op.drop_table("reviews")
    op.drop_index("ix_courses_created_at", table_name="courses")
    op.drop_index("ix_courses_category", table_name="courses")
    op.drop_table("courses")
    op.drop_table("admin_users")
