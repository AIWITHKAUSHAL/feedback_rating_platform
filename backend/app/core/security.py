"""Password hashing and JWT helpers for the admin control plane."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings
from app.core.exceptions import InvalidTokenError

# bcrypt truncates silently past 72 bytes, so reject longer passwords upfront.
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Return a bcrypt hash for ``password``."""
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes.")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8")[:MAX_PASSWORD_BYTES], password_hash.encode("utf-8")
        )
    except ValueError:
        # Malformed/legacy hash in the database - treat as a failed login.
        return False


def create_access_token(subject: str, *, expires_minutes: int | None = None) -> tuple[str, int]:
    """Create a signed JWT access token.

    Returns the token and its lifetime in seconds so the client can schedule a
    re-login without decoding the token itself.
    """
    lifetime = expires_minutes or settings.access_token_expire_minutes
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=lifetime)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "typ": "admin_access",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, lifetime * 60


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate an access token, raising InvalidTokenError if unusable."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("Your session has expired. Please sign in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError() from exc
    if payload.get("typ") != "admin_access" or not payload.get("sub"):
        raise InvalidTokenError()
    return payload
