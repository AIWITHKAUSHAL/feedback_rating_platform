"""Admin authentication endpoint (the only unprotected /api/admin route)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentAdmin, DbSession
from app.models.admin_user import AdminUser
from app.schemas.auth import AdminLoginRequest, AdminProfile, TokenResponse
from app.schemas.common import ErrorResponse
from app.services import auth as service

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Sign in to the admin area",
    responses={401: {"model": ErrorResponse, "description": "Invalid credentials"}},
)
def login(db: DbSession, payload: AdminLoginRequest) -> TokenResponse:
    """Exchange admin credentials for a short-lived JWT bearer token."""
    return service.login(db, str(payload.email), payload.password)


@router.get("/me", response_model=AdminProfile, summary="Current admin profile")
def me(admin: CurrentAdmin) -> AdminUser:
    """Return the signed-in admin - used by the SPA to validate a stored token."""
    return admin
