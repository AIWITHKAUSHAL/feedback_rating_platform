"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidTokenError
from app.db.session import get_db
from app.models.admin_user import AdminUser
from app.services import auth as auth_service

# auto_error=False so a missing header flows through our own error envelope
# instead of Starlette's default {"detail": ...} shape.
bearer_scheme = HTTPBearer(auto_error=False, description="Admin JWT access token")

DbSession = Annotated[Session, Depends(get_db)]


def get_current_admin(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> AdminUser:
    """Resolve the authenticated admin from the Authorization header."""
    if credentials is None or not credentials.credentials:
        raise InvalidTokenError("Missing admin access token.")
    return auth_service.admin_from_token(db, credentials.credentials)


CurrentAdmin = Annotated[AdminUser, Depends(get_current_admin)]
