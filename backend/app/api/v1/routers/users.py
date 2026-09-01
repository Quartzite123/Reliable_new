"""
User management — gated on the `users` phase (2026-09-01 admin
user-management overhaul; previously `admin`-phase-only), except
GET /users/me (any authenticated user).

POST   /api/v1/users        — create a worker account (name, mobile,
                              email, role, phases, temporary_password;
                              no self-signup, R53)
GET    /api/v1/users        — list users, each with its assigned phases —
                              filtered per app/services/user_admin_guard.py
                              rule 4 for a non-Admin `users` holder
GET    /api/v1/users/me     — the calling user's own profile
PATCH  /api/v1/users/{id}   — update anything about a user, including
                              their own password (admin-set, permanent —
                              no forced change at next login); writes an
                              audit event for status, password, lockout,
                              and phase changes
DELETE /api/v1/users/{id}   — soft delete: sets active=False, writes a
                              'User deactivated' audit event, returns the
                              updated user as JSON (200) — matches the
                              frontend's `softDelete` expecting a User body,
                              not a 204. Never a real row deletion (R30/R54).
                              ("Delete" is the historical name for this
                              action; it has only ever deactivated.)

There is no hard-delete: every audit FK in the system (created_by /
inspected_by / ...) points at users.id, so removing a user row would
destroy the accountability chain.

Phase access (`user_phase_access`) is the actual permission mechanism —
`users.role` is a display label only (CLAUDE.md §4.9/§12, R53/R58).
`require_phase(PhaseKey.USERS)` is the router-level gate, but it's not
the whole security boundary here — see app/services/user_admin_guard.py
for the actor/target/change-dependent rules layered on top (a `users`
holder who isn't an Admin can't touch Admin accounts, can't edit their
own phases, and can't grant `users` or Admin to anyone).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import get_current_user, require_phase
from app.core.enums import PhaseKey, UserRole
from app.core.security import hash_password
from app.models.user import User
from app.models.user_phase_access import UserPhaseAccess
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import user_admin_guard as guard
from app.services.audit import record_audit_event

router = APIRouter()

_users_phase = Depends(require_phase(PhaseKey.USERS))


def _status_label(active: bool) -> str:
    return "active" if active else "inactive"


def _set_phases(db: Session, user: User, phases: list[PhaseKey]) -> None:
    db.execute(delete(UserPhaseAccess).where(UserPhaseAccess.user_id == user.id))
    for phase in phases:
        db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_users_phase],
)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_phase(PhaseKey.USERS)),
) -> User:
    guard.assert_no_admin_role_grant(actor, body.role)
    guard.assert_no_users_phase_grant(actor, body.phases)

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
        mobile=body.mobile,
        password_hash=hash_password(body.temporary_password),
        role=body.role,
        active=True,
    )
    db.add(user)
    db.flush()  # assigns user.id, needed before creating phase_access rows

    phases = guard.forced_admin_phases(body.phases) if body.role == UserRole.ADMIN else body.phases
    for phase in phases:
        db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))

    record_audit_event(
        db, actor,
        action="User created", module="Users", record_ref=user.email,
    )

    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead], dependencies=[_users_phase])
def list_users(
    db: Session = Depends(get_db),
    actor: User = Depends(require_phase(PhaseKey.USERS)),
) -> list[User]:
    all_users = list(db.scalars(select(User).order_by(User.id)))
    return guard.visible_users(actor, all_users)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_phase(PhaseKey.USERS)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    guard.assert_can_target(actor, user)
    guard.assert_no_admin_role_grant(actor, body.role)
    guard.assert_no_self_phase_edit(actor, user, body.phases)
    guard.assert_no_users_phase_grant(actor, body.phases)
    guard.assert_admin_phases_immutable(user, body.phases)

    if body.active is False and user.id == actor.id:
        # An admin locking themselves out is unrecoverable without DB access.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    if body.active is False:
        guard.assert_not_last_active_admin(db, user)

    if body.active is not None and body.active != user.active:
        old_status = _status_label(user.active)
        user.active = body.active
        record_audit_event(
            db, actor,
            action="User status changed", module="Users", record_ref=user.email,
            old_status=old_status, new_status=_status_label(user.active),
        )

    if body.name is not None:
        user.name = body.name

    if body.email is not None:
        new_email = body.email.lower()
        if new_email != user.email:
            clash = db.scalar(select(User).where(User.email == new_email, User.id != user.id))
            if clash is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists",
                )
            user.email = new_email

    if body.mobile is not None:
        user.mobile = body.mobile

    if body.role is not None:
        user.role = body.role
        if body.role == UserRole.ADMIN and body.phases is None:
            # Promoting to Admin without an explicit phases payload still
            # has to end up holding every phase (rule 5's create-time
            # counterpart) — force it even though `phases` wasn't sent.
            _set_phases(db, user, guard.forced_admin_phases([]))
            record_audit_event(
                db, actor,
                action="User phases changed", module="Users", record_ref=user.email,
            )

    if body.password is not None:
        user.password_hash = hash_password(body.password)
        # Bumping this is what actually revokes every access/refresh token
        # issued before now (core/deps.py's token_predates_password_change)
        # — the fix for "a leaked refresh token stays valid for 7 days no
        # matter what" (2026-09-01 security audit fix #3).
        user.password_changed_at = datetime.now(timezone.utc)
        record_audit_event(
            db, actor,
            action="Password reset", module="Users", record_ref=user.email,
        )

    if body.reset_lockout:
        user.failed_login_count = 0
        user.last_failed_login_at = None
        record_audit_event(
            db, actor,
            action="Login lockout cleared", module="Users", record_ref=user.email,
        )

    if body.phases is not None:
        phases = guard.forced_admin_phases(body.phases) if user.role == UserRole.ADMIN else body.phases
        _set_phases(db, user, phases)
        record_audit_event(
            db, actor,
            action="User phases changed", module="Users", record_ref=user.email,
        )

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserRead)
def soft_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_phase(PhaseKey.USERS)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    guard.assert_can_target(actor, user)

    if user.id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    guard.assert_not_last_active_admin(db, user)

    old_status = _status_label(user.active)
    user.active = False  # no hard delete — R30/R54 accountability chain

    record_audit_event(
        db, actor,
        action="User deactivated", module="Users", record_ref=user.email,
        old_status=old_status, new_status="inactive",
    )

    db.commit()
    db.refresh(user)
    return user
