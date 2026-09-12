"""Admin authentication: login, token validation and account bootstrap."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, InvalidTokenError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.admin_user import AdminUser
from app.repositories import admins as repo
from app.schemas.auth import TokenResponse

logger = logging.getLogger(__name__)


def login(db: Session, email: str, password: str) -> TokenResponse:
    """Verify credentials and issue a short-lived bearer token.

    The same generic error is returned for an unknown email, a wrong password
    and a deactivated account, so the endpoint cannot be used to enumerate
    admin accounts. Passwords are never logged.
    """
    admin = repo.get_by_email(db, email)
    if admin is None or not verify_password(password, admin.password_hash) or not admin.is_active:
        logger.warning("admin_login_failed", extra={"email_domain": email.rpartition("@")[2]})
        raise AuthenticationError()

    token, expires_in = create_access_token(str(admin.id))
    logger.info("admin_login_succeeded", extra={"admin_id": admin.id})
    return TokenResponse(access_token=token, expires_in=expires_in)


def admin_from_token(db: Session, token: str) -> AdminUser:
    """Resolve the admin behind a bearer token, or raise InvalidTokenError."""
    payload = decode_access_token(token)
    try:
        admin_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidTokenError() from exc

    admin = repo.get_by_id(db, admin_id)
    if admin is None or not admin.is_active:
        raise InvalidTokenError()
    return admin


def create_or_update_admin(db: Session, email: str, password: str) -> tuple[AdminUser, bool]:
    """Idempotently create an admin account (or reset its password).

    Returns ``(admin, created)``. Used by ``scripts/create_admin.py`` - the
    password comes from the environment and is never written to logs or git.
    """
    normalized = email.strip().lower()
    existing = repo.get_by_email(db, normalized)
    if existing is not None:
        existing.password_hash = hash_password(password)
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing, False

    admin = AdminUser(email=normalized, password_hash=hash_password(password), is_active=True)
    repo.add(db, admin)
    db.commit()
    db.refresh(admin)
    return admin, True
