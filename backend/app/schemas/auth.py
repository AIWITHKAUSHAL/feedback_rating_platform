"""Admin authentication schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

Password = Annotated[str, StringConstraints(min_length=8, max_length=72)]


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: Password


class TokenResponse(BaseModel):
    """Bearer token returned by POST /api/admin/auth/login."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the token expires


class AdminProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_active: bool
    created_at: datetime
