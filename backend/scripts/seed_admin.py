"""
Create (or repair) the first Admin account.

Usage (from backend/ with the venv active):

    python -m scripts.seed_admin admin@reliablefresh.com "StrongPassword123"

or via environment variables:

    SEED_ADMIN_EMAIL=admin@reliablefresh.com SEED_ADMIN_PASSWORD=... python -m scripts.seed_admin

Behavior:
- No user with that email  -> creates an active Admin with ALL 14 phases
                              assigned (a bootstrap admin needs full access
                              — without this, phase-based nav filtering
                              would show them an empty menu on first login).
- User exists              -> resets password, forces role=admin, active=True,
                              and backfills any phases they're missing
                              (works as a break-glass recovery tool too).

Safe to run repeatedly. Requires the database migrations to have been
applied first (alembic upgrade head).
"""

import os
import sys

from sqlalchemy import select

import app.db  # noqa: F401  (registers all models before any query)
from app.db import SessionLocal
from app.core.enums import PhaseKey, UserRole
from app.core.security import hash_password
from app.models.user import User
from app.models.user_phase_access import UserPhaseAccess


def main() -> None:
    if len(sys.argv) >= 3:
        email, password = sys.argv[1], sys.argv[2]
    else:
        email = os.environ.get("SEED_ADMIN_EMAIL", "")
        password = os.environ.get("SEED_ADMIN_PASSWORD", "")

    if not email or not password:
        print(
            "Usage: python -m scripts.seed_admin <email> <password>\n"
            "   or: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... python -m scripts.seed_admin"
        )
        raise SystemExit(1)

    if len(password) < 8:
        print("Password must be at least 8 characters.")
        raise SystemExit(1)

    email = email.lower()
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
                active=True,
            )
            db.add(user)
            db.flush()  # assigns user.id before creating phase_access rows
            for phase in PhaseKey:
                db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))
            db.commit()
            print(f"Created admin account with full phase access: {email}")
        else:
            user.password_hash = hash_password(password)
            user.role = UserRole.ADMIN
            user.active = True
            existing_phases = {pa.phase_key for pa in user.phase_access}
            for phase in PhaseKey:
                if phase not in existing_phases:
                    db.add(UserPhaseAccess(user_id=user.id, phase_key=phase))
            db.commit()
            print(f"Updated existing user to active admin, reset password, backfilled all phases: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

