"""
The security boundary between a `users`-phase holder and a true Admin
(2026-09-01 admin user-management overhaul). `PhaseKey.USERS` alone —
enforced by `require_phase(PhaseKey.USERS)` on the router — is necessary
but not sufficient: these rules depend on the relationship between actor,
target, and the specific change requested, which a static phase gate can't
express. Confirmed rule set:

1. A `users` holder can create, edit, deactivate, and assign phases to
   non-admin users.
2. A `users` holder can NOT grant any phase to themselves.
3. A `users` holder can NOT grant the `users` phase to anyone — only an
   Admin can.
4. A `users` holder can NOT view, edit, deactivate, or change phases on
   any account that holds the `admin` phase.
5. An Admin (anyone holding the `admin` phase) always holds every phase
   and can't have any phase removed — including by another Admin. This
   prevents accidentally locking everyone out of user management.

"Admin" is determined by PhaseKey.ADMIN membership, not the `role` label
— consistent with this codebase's phase-first model (CLAUDE.md §4.9/§12,
"role is a display label only"). A mislabeled account (role != admin but
somehow holding the admin phase) is still protected; an account labeled
role=admin that doesn't hold the phase is not — that combination
shouldn't happen if user creation/update always forces phases=ALL_PHASES
for role=admin (see create_user/update_user in the users router), but the
check here is deliberately phase-based so it stays correct even if that
invariant is ever violated elsewhere.

Rule 2 blocks editing your own `phases` field at all while only holding
`users` — not just additions. A partial rule (block grants, allow
self-revocation) is an odd asymmetry and self-revocation of your own
`users` phase while mid-edit is its own confusing failure mode; blocking
both is simpler and safer.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import PhaseKey, UserRole
from app.models.user import User

_ADMIN_PROTECTED_DETAIL = "User not found"  # deliberately identical to the genuine 404 — rule 4 is "cannot view", not "view but forbidden"


def is_admin(user: User) -> bool:
    return PhaseKey.ADMIN in user.phases


def assert_can_target(actor: User, target: User) -> None:
    """Rule 4. Raise 404 (not 403) so a `users`-only actor can't distinguish
    "no such user" from "that user is an Admin" — matches "cannot view"."""
    if is_admin(target) and not is_admin(actor):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_ADMIN_PROTECTED_DETAIL)


def visible_users(actor: User, users: list[User]) -> list[User]:
    """Rule 4 applied to GET /users — Admin accounts are simply absent from
    the list for a non-Admin `users` holder, not present-but-blocked."""
    if is_admin(actor):
        return users
    return [u for u in users if not is_admin(u)]


def assert_no_self_phase_edit(actor: User, target: User, requested_phases: list[PhaseKey] | None) -> None:
    """Rule 2."""
    if requested_phases is None:
        return
    if target.id == actor.id and not is_admin(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change your own phase assignments.",
        )


def assert_no_users_phase_grant(actor: User, requested_phases: list[PhaseKey] | None) -> None:
    """Rule 3. Rejects the whole request rather than silently stripping
    `users` from the list — a partial success on a permissions request is
    worse than a clear failure."""
    if requested_phases is None:
        return
    if PhaseKey.USERS in requested_phases and not is_admin(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Admin can grant the Users phase.",
        )


def assert_admin_phases_immutable(target: User, requested_phases: list[PhaseKey] | None) -> None:
    """Rule 5. Applies unconditionally when the target is an Admin —
    including when the actor is also an Admin. Admin accounts always hold
    every phase; there is no partial edit of an Admin's phases."""
    if requested_phases is None:
        return
    if is_admin(target):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts always hold every phase and can't be edited here.",
        )


def assert_not_last_active_admin(db: Session, target: User) -> None:
    """
    Not explicitly one of the five confirmed rules, but follows directly
    from rule 5's intent (never let everyone lock out of user management)
    from a different angle: deactivating the only remaining active Admin
    has the same effect as stripping their phases. Mirrors the existing
    self-deactivation guard in the users router. Only meaningful to call
    when target is being deactivated and is currently an Admin.
    """
    if not is_admin(target):
        return
    other_active = db.scalars(select(User).where(User.active.is_(True), User.id != target.id)).all()
    if not any(is_admin(u) for u in other_active):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate the last active Admin account.",
        )


def forced_admin_phases(phases: list[PhaseKey]) -> list[PhaseKey]:
    """
    Rule 5 at creation time: a user created with role=admin must hold
    every phase, regardless of what was submitted — an Admin account
    created with a partial phase list would violate rule 5 the moment
    it's saved.
    """
    return list(PhaseKey)


def assert_no_admin_role_grant(actor: User, requested_role: UserRole | None) -> None:
    """
    Not one of the five confirmed rules directly, but a direct
    consequence of combining two of them: role=admin forces every phase
    (forced_admin_phases, rule 5's create-time counterpart), so without
    this check a `users` holder could set role=admin on some other
    account and hand it every phase — including `admin` and `users`
    itself — entirely bypassing rule 3 (can't grant the users phase) and
    rule 5 (only an Admin extends Admin). Widening the router gate from
    ADMIN to USERS (2026-09-01) is what introduces this gap; under the
    old single admin-only gate it couldn't happen since only an Admin
    could reach `role` at all.
    """
    if requested_role == UserRole.ADMIN and not is_admin(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Admin can grant the Admin role.",
        )
