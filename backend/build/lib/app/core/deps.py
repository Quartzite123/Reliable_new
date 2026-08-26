"""
FastAPI auth dependencies — the security backbone every router uses.

get_current_user : decodes the Bearer token, loads the User, rejects
                   invalid/expired tokens, refresh tokens used as access
                   tokens, unknown users, and deactivated accounts.
require_role(...) : dependency factory for role gating (403 on mismatch).
                    Admin passes every role gate (full access — R52).

Usage in a router:

    from app.core.deps import get_current_user, require_role
    from app.core.enums import UserRole

    @router.get("/mine")
    def whoami(user: User = Depends(get_current_user)): ...

    @router.post("/", dependencies=[Depends(require_role(UserRole.FIELD_WORKER))])
    def create_thing(...): ...

Role gating here is the BACKEND enforcement required by CLAUDE.md
("Never let frontend bypass a gate") — the frontend hiding a button is
never the real protection; these dependencies are.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

# Importing from app.db (the package) triggers app/db/__init__.py, which
# registers every model with SQLAlchemy's mapper registry — required for
# string-based relationships to resolve. Do not "optimize" this into a
# direct app.db.base import elsewhere without keeping that guarantee.
from app.db import get_db
from app.core.enums import UserRole
from app.core.security import JWTError, decode_token
from app.models.user import User

# auto_error=False so we can return a clean 401 (with WWW-Authenticate)
# instead of FastAPI's default 403 when the header is missing entirely.
_bearer_scheme = HTTPBearer(auto_error=False)

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _credentials_exc

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise _credentials_exc

    if payload.get("type") != "access":
        # A refresh token must never work as an access token.
        raise _credentials_exc

    subject = payload.get("sub")
    if subject is None:
        raise _credentials_exc

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise _credentials_exc

    user = db.get(User, user_id)
    if user is None:
        raise _credentials_exc
    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Like get_current_user but returns None instead of raising on any problem
    (missing/expired/invalid token, deactivated account). For endpoints that
    must still succeed even without a valid session — e.g. logout, which the
    client may call right as its token is expiring.
    """
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    subject = payload.get("sub")
    if subject is None:
        return None
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        return None
    user = db.get(User, user_id)
    if user is None or not user.active:
        return None
    return user


def require_role(*roles: UserRole):
    """
    Returns a dependency that allows only the given roles (plus Admin,
    who passes every gate per R52 "full access").
    """

    allowed = set(roles) | {UserRole.ADMIN}

    def _role_gate(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return _role_gate
