"""SQLAlchemy engine, session factory and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _engine_kwargs() -> dict[str, object]:
    """Engine options. SQLite (used by nothing in production) has no pool sizing."""
    kwargs: dict[str, object] = {
        "echo": settings.db_echo,
        "future": True,
        # Recycle + pre-ping keep pooled connections healthy across RDS failovers
        # and idle timeouts.
        "pool_pre_ping": True,
    }
    if not settings.database_url.startswith("sqlite"):
        kwargs.update(
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
        )
    return kwargs


engine = create_engine(settings.database_url, **_engine_kwargs())

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped session and always close it."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
