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
    name, mobile, email, role, phases, and `temporaryPassword` — NOT
    `password`, since that's the wire-format field name the httpClient's
    snake_case transform produces (temporaryPassword -> temporary_password).
    """

    email: EmailStr
    name: str = Field(min_length=1)
    # Not unique — follows the farmers.mobile precedent, same reasoning as
    # models/user.py's column comment (2026-09-01 admin user-management
    # overhaul). Required here even though the DB column is nullable.
    mobile: str = Field(min_length=5, max_length=20)
    # 12, not 8 (2026-09-01 security audit fix #6) — 8 was the weak half of
    # the login-brute-force finding: short admin-set passwords plus no rate
    # limiting. Rate limiting is fixed separately (see login lockout,
    # core/security.py); this raises the floor on the other side.
    temporary_password: str = Field(min_length=12, description="Initial password set by Admin (R53)")
    role: UserRole
    phases: list[PhaseKey] = Field(min_length=1, description="At least one phase must be assigned (R58)")


class UserUpdate(BaseModel):
    """
    PATCH /users/{id} — all optional; only provided fields change.
    Everything about a user is editable this way, including their own
    password (admin-set, permanent — no forced change at next login,
    2026-09-01 admin user-management overhaul) — a password change bumps
    password_changed_at, which revokes every access/refresh token already
    issued to that user (security audit fix #3).

    Enforcement beyond "is this field present": app/services/
    user_admin_guard.py — a `users`-phase holder (not `admin`) can't
    target an admin account at all, can't edit their own phases, can't
    grant the `users` phase to anyone, and can't touch an admin target's
    phases even as an admin actor (admin always holds every phase). See
    that module's docstring for the full rule set.
    """

    name: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    mobile: str | None = Field(default=None, min_length=5, max_length=20)
    role: UserRole | None = None
    active: bool | None = None
    password: str | None = Field(default=None, min_length=12, description="Admin password reset")
    phases: list[PhaseKey] | None = Field(default=None, min_length=1)
    reset_lockout: bool | None = Field(
        default=None,
        description="Admin clears a login lockout early — zeroes failed_login_count/last_failed_login_at (login lockout fix, 2026-09-01)",
    )


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str | None = None
    mobile: str | None = None
    role: UserRole
    active: bool
    phases: list[PhaseKey] = []
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None
    failed_login_count: int = 0
    locked_until: datetime | None = None


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
