"""
FastAPI auth dependencies — the security backbone every router uses.

get_current_user : decodes the Bearer token, loads the User, rejects
                   invalid/expired tokens, refresh tokens used as access
                   tokens, unknown users, and deactivated accounts.
require_role(...) : dependency factory for role gating (403 on mismatch).
                    Admin passes every role gate (full access — R52).
require_phase(...): dependency factory for phase gating (403 on mismatch).
                    This is the actual access-control mechanism per
                    CLAUDE.md §4.9/§12 and Business_Rules R53/R58 — role
                    is a display label only. Admin passes because the
                    Admin account holds all 14 PhaseKey rows in
                    user_phase_access (scripts/seed_admin.py), not
                    because of a role special-case here — see that
                    function's docstring for why.
require_any_phase() : dependency for shared cross-cutting reference reads
                    (/plots, /farmers, /registrations) that most
                    downstream phases legitimately join against — see
                    its own docstring for why an allowlist is wrong here.

Usage in a router:

    from app.core.deps import get_current_user, require_role, require_phase, require_any_phase
    from app.core.enums import UserRole, PhaseKey

    @router.get("/mine")
    def whoami(user: User = Depends(get_current_user)): ...

    @router.post("/", dependencies=[Depends(require_role(UserRole.FIELD_WORKER))])
    def create_thing(...): ...

    @router.get("/", dependencies=[Depends(require_phase(PhaseKey.WEIGHING))])
    def list_things(...): ...

    @router.get("/plots", dependencies=[Depends(require_any_phase())])
    def list_plots(...): ...

Role/phase gating here is the BACKEND enforcement required by CLAUDE.md
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
from app.core.enums import PhaseKey, UserRole
from app.core.security import JWTError, decode_token, token_issued_at
from app.models.user import User

# auto_error=False so we can return a clean 401 (with WWW-Authenticate)
# instead of FastAPI's default 403 when the header is missing entirely.
_bearer_scheme = HTTPBearer(auto_error=False)

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

# Distinct from _credentials_exc (2026-09-02, session-expiry UX fix) so
# the frontend can skip a doomed refresh attempt: if the ACCESS token
# fails this check, the refresh token from the same login (or any
# refresh chain descending from it) is structurally guaranteed to fail
# the identical check in POST /auth/refresh — both were minted before
# whatever password change moved password_changed_at forward. No point
# spending a network round-trip finding that out.
_password_changed_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"message": "Your password was changed. Please log in again.", "code": "password_changed"},
    headers={"WWW-Authenticate": "Bearer"},
)


def token_predates_password_change(payload: dict, user: User) -> bool:
    """
    Token revocation (2026-09-01 security audit fix #3): True if this
    token's iat is older than the user's password_changed_at, meaning the
    password was changed after this token was issued — reject it even
    though its own exp hasn't passed yet. This is what actually revokes a
    leaked access OR refresh token; logout alone never did (v1 has no
    blacklist — see auth.py). A token with no iat claim at all (minted
    before this fix existed) is treated the same as "predates" — fail
    closed, don't special-case tokens from before iat was added.
    """
    iat = payload.get("iat")
    if iat is None:
        return True
    return token_issued_at(payload) < user.password_changed_at


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
    if token_predates_password_change(payload, user):
        raise _password_changed_exc
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
    if token_predates_password_change(payload, user):
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


def require_phase(*phases: PhaseKey):
    """
    Returns a dependency that allows only users holding at least one of
    the given phases in user_phase_access (User.phases). No role
    special-case: Admin passes because scripts/seed_admin.py seeds the
    Admin account with all 14 PhaseKey rows, the same way `RequirePhase`
    on the frontend (routes/RequirePhase.tsx) checks `user.phases` with
    no Admin bypass either. Keeping a single mechanism — phase
    membership — for both layers avoids a second, role-based backdoor
    that CLAUDE.md §4.9/§12 explicitly says not to check
    ("Never use users.role for permission checks").

    Caveat this depends on: an Admin created via POST /users must be
    given all 14 phases in the request body — nothing here or in that
    endpoint auto-grants them. scripts/seed_admin.py handles the
    bootstrap account; there is no equivalent backfill for
    admins created later through the UI.
    """

    required = set(phases)

    def _phase_gate(user: User = Depends(get_current_user)) -> User:
        if not required.intersection(user.phases):
            names = ", ".join(sorted(p.value for p in required))
            detail = (
                f"This action requires the '{names}' phase"
                if len(required) == 1
                else f"This action requires one of these phases: {names}"
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
        return user

    return _phase_gate


def require_any_phase():
    """
    Returns a dependency that allows any authenticated user holding at
    least one phase in user_phase_access — i.e. any real operational
    account (UserCreate.phases requires min_length=1, R58).

    Deliberately NOT a require_phase(...) allowlist. /plots, /farmers,
    and /registrations are cross-cutting reference data: harvests,
    packaging, lab_samples, contracts, palletisation, and arrival_qc all
    read them client-side to join farmer/plot names onto their own rows
    (CLAUDE.md §4.1 — "reference info from other roles is passed as
    read-only, never re-typed"). An allowlist here would have to name 7
    of the 13 operational phases today, which isn't a meaningful
    restriction, and it creates an ongoing coupling: every time a new
    feature starts joining against this data, a legitimate user 403s
    until someone remembers to widen the list. require_any_phase keeps
    the actual restriction (must be a real operational account, not a
    bare valid token) without that coupling.
    """

    def _any_phase_gate(user: User = Depends(get_current_user)) -> User:
        if not user.phases:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has no phases assigned — contact an admin",
            )
        return user

    return _any_phase_gate
