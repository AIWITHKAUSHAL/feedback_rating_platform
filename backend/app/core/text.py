"""Small text helpers shared by services and seed scripts."""

from __future__ import annotations

import re
import unicodedata

_SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def slugify(value: str, *, max_length: int = 200) -> str:
    """Turn a course title into a URL friendly slug.

    ``"FastAPI Production APIs"`` -> ``"fastapi-production-apis"``
    """
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = _SLUG_STRIP.sub("-", normalized.lower()).strip("-")
    return slug[:max_length].rstrip("-") or "course"


def normalize_email(email: str) -> str:
    """Normalize an email for duplicate detection.

    Casing and surrounding whitespace are the only things normalized: the local
    part is case sensitive per RFC 5321 in theory, but every real mail provider
    treats it case-insensitively, and students must not be able to bypass the
    one-review rule by capitalising a letter. Gmail dot/plus tricks are
    deliberately NOT collapsed - that would surprise users of other providers.
    """
    return email.strip().lower()


def mask_email(email: str) -> str:
    """Partially mask an email for the moderation UI.

    ``"student.one@example.com"`` -> ``"st*********@example.com"``
    Admins need enough to recognise a repeat reviewer without the full address
    being copy-pasteable out of the dashboard.
    """
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[:2]}{'*' * (len(local) - 2)}@{domain}"
