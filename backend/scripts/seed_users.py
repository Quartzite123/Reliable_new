"""
Create one user per role with fixed dev credentials.

Usage (from backend/ with the venv active):

    python -m scripts.seed_users

Safe to run repeatedly — skips any user whose email already exists rather
than touching it (unlike seed_admin.py, this is not a break-glass recovery
tool, just dev/test fixture data). The one exception is `name`: an existing
user created before that column existed gets its name backfilled if it's
still NULL, so re-running this script after adding `name` support is enough
to fix up accounts seeded by an older version of this script.

Phases are assigned ONLY on first creation, matching CLAUDE.md §6's
role-to-phase ownership (backend/app/core/deps.py's require_phase is the
enforcement, this is just the default grant for a freshly seeded account).
Because existing users are otherwise left untouched, this script will NOT
retroactively fix a phase assignment that was set wrong through the Users
admin UI after creation — that needs a one-off UPDATE against
user_phase_access, not a re-run of this script.
"""

from sqlalchemy import select

import app.db  # noqa: F401  (registers all models before any query)
from app.db import SessionLocal
from app.core.enums import PhaseKey, UserRole
from app.core.security import hash_password
from app.models.user import User
from app.models.user_phase_access import UserPhaseAccess

USERS = [
    (UserRole.ADMIN, "admin@reliablefresh.com", "Admin@123", "Admin User", []),
    (
        UserRole.FIELD_WORKER,
        "fieldworker@reliablefresh.com",
        "Field@123",
        "Field Worker",
        [
            PhaseKey.FARMER_REGISTRATION,
            PhaseKey.PLOT_REGISTRATION,
            PhaseKey.FIELD_QC,
            PhaseKey.HARVESTING,
            PhaseKey.WEIGHING,
            PhaseKey.ARRIVAL_QC,  # CLAUDE.md §6: Field Worker owns Arrival QC
        ],
    ),
    (
        UserRole.LAB_WORKER,
        "labworker@reliablefresh.com",
        "Lab@123",
        "Lab Worker",
        [PhaseKey.LAB_SAMPLING],  # Lab Sampling/MRL only, per CLAUDE.md §6 — not arrival_qc
    ),
    (
        UserRole.OFFICE_WORKER,
        "officeworker@reliablefresh.com",
        "Office@123",
        "Office Worker",
        [PhaseKey.FARMER_REGISTRATION, PhaseKey.FARMER_CONTRACT, PhaseKey.PACKAGING],
    ),
    (
        UserRole.STOCK_MANAGER,
        "stockmanager@reliablefresh.com",
        "Stock@123",
        "Stock Manager",
        [
            PhaseKey.INVENTORY_MANAGEMENT,
            PhaseKey.PACKAGING,
            # Provisional pending Open Question #9 (pre-cooling role owner
            # not yet confirmed by CEO) — granted here because cold storage
            # sits closer to stock management than office paperwork.
            # Revisit once Q9 is answered.
            PhaseKey.PRE_COOLING,
        ],
    ),
    (
        UserRole.PACKAGING_SUPERVISOR,
        "packagingsupervisor@reliablefresh.com",
        "Packaging@123",
        "Packaging Supervisor",
        [PhaseKey.PALLETISATION, PhaseKey.PRE_COOLING],
    ),
]


def main() -> None:
    db = SessionLocal()
    try:
        created = []
        skipped = []
        name_backfilled = []
        for role, email, password, name, phases in USERS:
            existing = db.scalar(select(User).where(User.email == email))
            if existing is not None:
                if existing.name is None:
                    existing.name = name
                    name_backfilled.append(email)
                else:
                    skipped.append(email)
                continue
            user = User(
                email=email,
                name=name,
                password_hash=hash_password(password),
                role=role,
                active=True,
            )
            db.add(user)
            db.flush()  # assigns user.id before creating phase_access rows
            for phase in phases:
                db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))
            created.append(email)

        db.commit()

        for email in created:
            print(f"Created: {email}")
        for email in name_backfilled:
            print(f"Already existed, backfilled name: {email}")
        for email in skipped:
            print(f"Already existed: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
