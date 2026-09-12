"""Admin user database access."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser


def get_by_email(db: Session, email: str) -> AdminUser | None:
    """Case-insensitive lookup by email."""
    return db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email.strip().lower()))


def get_by_id(db: Session, admin_id: int) -> AdminUser | None:
    return db.get(AdminUser, admin_id)


def add(db: Session, admin: AdminUser) -> AdminUser:
    db.add(admin)
    db.flush()
    return admin


def count_all(db: Session) -> int:
    return db.scalar(select(func.count(AdminUser.id))) or 0
