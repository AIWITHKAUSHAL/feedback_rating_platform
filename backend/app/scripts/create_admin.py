"""Idempotent admin bootstrap.

    ADMIN_EMAIL=admin@coursepulse.dev ADMIN_PASSWORD='...' python -m app.scripts.create_admin

Credentials come from the environment only - nothing is hard-coded, prompted
into shell history, or printed back out. Re-running with the same email resets
that admin's password instead of failing.
"""

from __future__ import annotations

import logging
import sys

from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import SessionLocal
from app.services.auth import create_or_update_admin

logger = logging.getLogger("app.create_admin")

MIN_PASSWORD_LENGTH = 8


def run() -> int:
    """Create or update the admin account described by the environment."""
    configure_logging()
    email = settings.admin_email.strip()
    password = settings.admin_password

    if not email or not password:
        print(
            "ADMIN_EMAIL and ADMIN_PASSWORD must be set.\n"
            "Example:\n"
            "  ADMIN_EMAIL=admin@coursepulse.dev ADMIN_PASSWORD='choose-a-strong-one' \\\n"
            "    python -m app.scripts.create_admin",
            file=sys.stderr,
        )
        return 1
    if len(password) < MIN_PASSWORD_LENGTH:
        print(
            f"ADMIN_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters.",
            file=sys.stderr,
        )
        return 1

    with SessionLocal() as db:
        admin, created = create_or_update_admin(db, email, password)

    action = "created" if created else "password reset"
    logger.info("admin_bootstrap", extra={"admin_id": admin.id, "action": action})
    print(f"Admin {action}: {admin.email}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
