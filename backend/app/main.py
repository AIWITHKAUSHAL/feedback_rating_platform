"""FastAPI application factory for the CoursePulse API.

Wiring order matters: logging first, then middleware, then exception handlers,
then routes. The database schema is owned by Alembic - this module never calls
``create_all``, so a deployment can never silently reshape a live database.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, courses, health, reviews, stats
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import register_middleware

logger = logging.getLogger(__name__)

DESCRIPTION = """
Course feedback and rating platform API.

* **Public** - browse and search courses, read feedback, submit one review per
  course per email address.
* **Admin** - JWT protected course management, review moderation and platform
  statistics.

Public averages and review counts are computed from **visible** reviews only.
"""

TAGS_METADATA = [
    {"name": "health", "description": "Liveness and readiness probes."},
    {"name": "courses", "description": "Public course catalogue and details."},
    {"name": "reviews", "description": "Public student feedback submission."},
    {"name": "stats", "description": "Public platform counters."},
    {"name": "admin-auth", "description": "Admin sign-in."},
    {"name": "admin", "description": "Protected admin control plane."},
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Log start-up and shutdown without leaking connection details."""
    settings: Settings = app.state.settings
    logger.info(
        "application_startup",
        extra={"environment": settings.environment, "version": settings.app_version},
    )
    yield
    logger.info("application_shutdown")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=DESCRIPTION,
        openapi_tags=TAGS_METADATA,
        lifespan=lifespan,
        # Interactive docs stay available: this is a teaching project and the
        # admin routes are authenticated.
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.state.settings = settings

    # Explicit origins from configuration - never "*" .
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # The SPA sends a bearer token, not cookies, so credentialed CORS is
        # not needed (and would forbid wildcard origins anyway).
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    register_middleware(app, settings)
    register_exception_handlers(app)

    # Health checks live at the root so the ALB target group can use /health.
    app.include_router(health.router)

    api_routers = (stats.router, courses.router, reviews.router, auth.router, admin.router)
    for router in api_routers:
        app.include_router(router, prefix=settings.api_prefix)
    # Versioned aliases for forward compatibility; hidden from the docs so the
    # schema stays readable.
    for router in api_routers:
        app.include_router(router, prefix=f"{settings.api_prefix}/v1", include_in_schema=False)

    @app.get("/", tags=["health"], summary="Service banner")
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
