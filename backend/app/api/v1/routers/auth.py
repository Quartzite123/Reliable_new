"""
POST /api/v1/auth/login    — email + password -> access + refresh tokens
POST /api/v1/auth/refresh  — refresh token -> new access token
POST /api/v1/auth/logout   — stateless 200 (client discards tokens; v1 has
                             no server-side token blacklist beyond the
                             password_changed_at check below)

Login is deliberately vague on failure ("Incorrect email or password") so
it never reveals whether an email exists — and, as of the 2026-09-01
security audit fix, deliberately TIMING-vague too: a nonexistent email
still runs a real bcrypt verify (against a fixed dummy hash) and a real
UPDATE+commit shaped like the real "wrong password" branch's write, so it
costs the same. Before this fix the two paths measured ~819ms vs ~2453ms
(a ~1.6s gap) against the live Neon-hosted DB — trivially observable, not
a theoretical side-channel. Adding just the bcrypt decoy closed most of
it but left a real ~260-330ms residual once measurement artifacts were
isolated (a bare `db.commit()` with nothing pending is measurably cheaper
than an UPDATE+commit) — the zero-row UPDATE below closes that too. See
core/security.py's verify_password_timing_decoy.

Failed logins lock the account after MAX_FAILED_LOGIN_ATTEMPTS for
LOGIN_LOCKOUT_MINUTES (core/security.py) — failed_login_count and
last_failed_login_at existed before this fix but were write-only,
visible on the admin User Activity screen but never enforced. An admin
can clear a lockout early via PATCH /users/{id} (resetLockout: true).

Deactivated accounts are rejected at login AND on every authenticated
request (app/core/deps.py) — so deactivating a user locks them out within
one access-token lifetime. Password changes are enforced the same way:
any token (access OR refresh) whose iat predates the user's current
password_changed_at is rejected, closing the "leaked refresh token stays
valid for 7 days no matter what" gap — see core/deps.py's
token_predates_password_change, reused here for /refresh.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import token_predates_password_change, get_optional_user
from app.core.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    verify_password_timing_decoy,
)
from app.models.user import User
from app.schemas.user import AccessToken, LoginRequest, LoginResponse, RefreshRequest, Token

router = APIRouter()

_bad_login = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Incorrect email or password",
)

_invalid_refresh = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired refresh token",
)


def _lockout_exception(locked_until: datetime) -> HTTPException:
    minutes_left = max(1, int((locked_until - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds() // 60) + 1)
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many failed login attempts. Try again in about {minutes_left} minute(s), or ask an admin to clear the lockout.",
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))

    if user is None:
        # Timing decoy — see module docstring. Burns the same bcrypt cost
        # as the real verify_password call below, plus a real UPDATE
        # statement shaped like the write the "user exists, wrong
        # password" branch does — id=-1 never exists, so this touches
        # zero rows, but still pays the same round-trip/parse/plan/commit
        # cost as a real UPDATE (a bare db.commit() with nothing pending
        # measured meaningfully cheaper than that, so it wasn't enough on
        # its own).
        verify_password_timing_decoy()
        db.execute(update(User).where(User.id == -1).values(failed_login_count=User.failed_login_count))
        db.commit()
        raise _bad_login

    if user.locked_until is not None:
        raise _lockout_exception(user.locked_until)

    if not verify_password(body.password, user.password_hash):
        user.failed_login_count += 1
        user.last_failed_login_at = datetime.now(timezone.utc)
        db.commit()
        raise _bad_login

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    now = datetime.now(timezone.utc)
    user.last_login_at = now
    user.last_activity_at = now
    user.failed_login_count = 0
    user.last_failed_login_at = None
    db.commit()
    db.refresh(user)
    subject = str(user.id)
    return LoginResponse(
        user=user,
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )


@router.post("/refresh", response_model=AccessToken)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> AccessToken:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise _invalid_refresh
    if payload.get("type") != "refresh":
        raise _invalid_refresh

    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise _invalid_refresh

    user = db.get(User, user_id)
    if user is None or not user.active:
        raise _invalid_refresh
    if token_predates_password_change(payload, user):
        raise _invalid_refresh
    return AccessToken(access_token=create_access_token(str(user.id)))


@router.post("/logout")
def logout(
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    # Stateless for v1 — client deletes its stored tokens regardless of what
    # happens here. If server-side revocation is ever needed, add a token
    # blacklist table. get_optional_user (rather than get_current_user) means
    # this still succeeds even if the access token has already expired —
    # activity is recorded opportunistically, never a hard requirement.
    if user is not None:
        user.last_logout_at = datetime.now(timezone.utc)
        db.commit()
    return {"detail": "Logged out"}
