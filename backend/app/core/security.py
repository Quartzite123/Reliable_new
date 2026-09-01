"""
Password hashing and JWT encode/decode helpers.

Pure utility functions — no FastAPI routes or dependencies here. Route-level
auth (login endpoint, get_current_user dependency, role-gating decorators)
belongs in app/api/v1/routers/ once that's built.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Login lockout (2026-09-01 security audit fix #2): failed_login_count and
# last_failed_login_at already existed on User but were never enforced —
# they were write-only, visible on the admin User Activity screen but
# nothing checked them. Locking after 5 consecutive failures for a 15
# minute cooldown is the enforcement; both numbers are conservative
# defaults for a ~12-user internal system, not tuned against real traffic.
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

# A fixed, valid bcrypt hash that matches no real password — used only to
# burn the same ~200ms bcrypt cost on a login attempt for an email that
# doesn't exist, so that path takes the same time as "email exists, wrong
# password" (2026-09-01 security audit: unauthenticated email enumeration
# via a measured ~1.6s timing gap between the two cases — see
# app/api/v1/routers/auth.py). Never used to authenticate anything; there
# is no password that hashes to this value being checked against a real
# account.
_DUMMY_PASSWORD_HASH = "$2b$12$twxyh/8gM180WnYdYQd9/uVlRs.maDFoWoVPoMpdQFheA68/6ceH2"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_password_timing_decoy() -> None:
    """
    Runs a real bcrypt verify against a fixed dummy hash and discards the
    result. Call this on the "no such user" login path so it costs the same
    as the "user exists, password wrong" path (which calls verify_password
    for real) — see _DUMMY_PASSWORD_HASH.
    """
    pwd_context.verify("irrelevant-input-never-matches", _DUMMY_PASSWORD_HASH)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": subject, "iat": now, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode = {"sub": subject, "iat": now, "exp": expire, "type": "refresh"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Raises jose.JWTError (or a subclass, e.g. ExpiredSignatureError) if invalid/expired."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def token_issued_at(payload: dict[str, Any]) -> datetime:
    """
    payload['iat'] comes back from jose as a Unix timestamp (int/float) —
    convert to a naive UTC datetime to match this codebase's convention for
    every other timestamp column (DateTime() columns store naive-but-UTC
    values; see models/user.py, and confirmed empirically — a fresh row's
    created_at comes back with tzinfo=None even though it was written via
    datetime.now(timezone.utc)). Comparing this against User.password_changed_at
    needs both sides naive, or Python raises on offset-naive vs offset-aware.
    """
    return datetime.fromtimestamp(payload["iat"], tz=timezone.utc).replace(tzinfo=None)


__all__ = [
    "hash_password",
    "verify_password",
    "verify_password_timing_decoy",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "token_issued_at",
    "JWTError",
]
