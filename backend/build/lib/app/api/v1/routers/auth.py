"""
POST /api/v1/auth/login    — email + password -> access + refresh tokens
POST /api/v1/auth/refresh  — refresh token -> new access token
POST /api/v1/auth/logout   — stateless 200 (client discards tokens; v1 has
                             no server-side token blacklist)

Login is deliberately vague on failure ("Incorrect email or password") so
it never reveals whether an email exists. Deactivated accounts are rejected
at login AND on every authenticated request (app/core/deps.py) — so
deactivating a user locks them out within one access-token lifetime.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_optional_user
from app.core.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.user import AccessToken, LoginRequest, LoginResponse, RefreshRequest, Token

router = APIRouter()

_bad_login = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Incorrect email or password",
)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        if user is not None:
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.get(User, user_id)
    if user is None or not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
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
