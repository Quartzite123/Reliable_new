"""
Pydantic schemas for users and authentication.

Naming convention used across all schema files:
  *Create — request body for POST (what the client sends to create)
  *Update — request body for PATCH (all fields optional)
  *Read   — response body (what the API returns; never includes secrets)

UserRead never exposes password_hash. Role values serialize as the
human-facing strings from app/core/enums.py (e.g. "field_worker").
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import PhaseKey, UserRole


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# --------------------------------------------------------------------------
# Users (admin-managed — no self-signup, R53/R54)
# --------------------------------------------------------------------------

class UserCreate(BaseModel):
    """
    Matches the frontend's CreateUserInput exactly (features/users/types.ts):
    name, email, role, phases, and `temporaryPassword` — NOT `password`,
    since that's the wire-format field name the httpClient's snake_case
    transform produces (temporaryPassword -> temporary_password).
    """

    email: EmailStr
    name: str = Field(min_length=1)
    temporary_password: str = Field(min_length=8, description="Initial password set by Admin (R53)")
    role: UserRole
    phases: list[PhaseKey] = Field(min_length=1, description="At least one phase must be assigned (R58)")


class UserUpdate(BaseModel):
    """
    PATCH /users/{id} — all optional; only provided fields change. The
    frontend only ever sends one of `phases` (EditPhasesForm) or `active`
    (status toggle) at a time, never both — but either combination is
    handled here. `role` and `password` remain available for admin use
    even though the current UI doesn't expose them (no update-role or
    password-reset screen yet).
    """

    role: UserRole | None = None
    active: bool | None = None
    password: str | None = Field(default=None, min_length=8, description="Admin password reset")
    phases: list[PhaseKey] | None = Field(default=None, min_length=1)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str | None = None
    role: UserRole
    active: bool
    phases: list[PhaseKey] = []
    created_at: datetime
    updated_at: datetime


class LoginResponse(BaseModel):
    user: UserRead
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserActivityRead(BaseModel):
    """GET /user-activity row — login/session bookkeeping per user, admin-only."""

    user_id: int
    name: str | None = None
    email: EmailStr
    roles: list[UserRole]
    active: bool
    last_login_at: datetime | None = None
    last_logout_at: datetime | None = None
    last_activity_at: datetime | None = None
    failed_login_count: int
    last_failed_login_at: datetime | None = None
