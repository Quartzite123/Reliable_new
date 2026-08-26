"""
User management — Admin only, except GET /users/me (any authenticated user).

POST   /api/v1/users        — create a worker account (name, email, role,
                              phases, temporary_password; no self-signup, R53)
GET    /api/v1/users        — list all users, each with its assigned phases
GET    /api/v1/users/me     — the calling user's own profile
PATCH  /api/v1/users/{id}   — update phases and/or active status (role and
                              password reset also supported); writes an
                              audit event for status and phase changes
DELETE /api/v1/users/{id}   — soft delete: sets active=False, writes a
                              'User deleted' audit event, returns the
                              updated user as JSON (200) — matches the
                              frontend's `softDelete` expecting a User body,
                              not a 204. Never a real row deletion (R30/R54).

There is no hard-delete: every audit FK in the system (created_by /
inspected_by / ...) points at users.id, so removing a user row would
destroy the accountability chain.

Phase access (`user_phase_access`) is the actual permission mechanism —
`users.role` is a display label only (CLAUDE.md §4.9/§12, R53/R58).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.models.user import User
from app.models.user_phase_access import UserPhaseAccess
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.audit import record_audit_event

router = APIRouter()

_admin_only = Depends(require_role())


def _status_label(active: bool) -> str:
    return "active" if active else "inactive"


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_admin_only],
)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role()),
) -> User:
    email = body.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=email,
        name=body.name,
        password_hash=hash_password(body.temporary_password),
        role=body.role,
        active=True,
    )
    db.add(user)
    db.flush()  # assigns user.id, needed before creating phase_access rows

    for phase in body.phases:
        db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))

    record_audit_event(
        db, admin,
        action="User created", module="Users", record_ref=user.email,
    )

    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead], dependencies=[_admin_only])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role()),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.active is False and user.id == admin.id:
        # An admin locking themselves out is unrecoverable without DB access.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    if body.active is not None and body.active != user.active:
        old_status = _status_label(user.active)
        user.active = body.active
        record_audit_event(
            db, admin,
            action="User status changed", module="Users", record_ref=user.email,
            old_status=old_status, new_status=_status_label(user.active),
        )

    if body.role is not None:
        user.role = body.role

    if body.password is not None:
        user.password_hash = hash_password(body.password)

    if body.phases is not None:
        db.execute(delete(UserPhaseAccess).where(UserPhaseAccess.user_id == user.id))
        for phase in body.phases:
            db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))
        record_audit_event(
            db, admin,
            action="User phases changed", module="Users", record_ref=user.email,
        )

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserRead)
def soft_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role()),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    old_status = _status_label(user.active)
    user.active = False  # no hard delete — R30/R54 accountability chain

    record_audit_event(
        db, admin,
        action="User deleted", module="Users", record_ref=user.email,
        old_status=old_status, new_status="deleted",
    )

    db.commit()
    db.refresh(user)
    return user
