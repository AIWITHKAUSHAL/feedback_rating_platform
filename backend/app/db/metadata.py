"""Single import point for Alembic's ``target_metadata``.

Importing every model here guarantees ``alembic revision --autogenerate`` sees
the full schema.
"""

from __future__ import annotations

from app.db.base import Base
from app.models.admin_user import AdminUser
from app.models.course import Course
from app.models.review import Review

target_metadata = Base.metadata

__all__ = ["AdminUser", "Base", "Course", "Review", "target_metadata"]
