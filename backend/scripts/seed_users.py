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
"""

from sqlalchemy import select

import app.db  # noqa: F401  (registers all models before any query)
from app.db import SessionLocal
from app.core.enums import UserRole
from app.core.security import hash_password
from app.models.user import User

USERS = [
    (UserRole.ADMIN, "admin@reliablefresh.com", "Admin@123", "Admin User"),
    (UserRole.FIELD_WORKER, "fieldworker@reliablefresh.com", "Field@123", "Field Worker"),
    (UserRole.LAB_WORKER, "labworker@reliablefresh.com", "Lab@123", "Lab Worker"),
    (UserRole.OFFICE_WORKER, "officeworker@reliablefresh.com", "Office@123", "Office Worker"),
    (UserRole.STOCK_MANAGER, "stockmanager@reliablefresh.com", "Stock@123", "Stock Manager"),
]


def main() -> None:
    db = SessionLocal()
    try:
        created = []
        skipped = []
        name_backfilled = []
        for role, email, password, name in USERS:
            existing = db.scalar(select(User).where(User.email == email))
            if existing is not None:
                if existing.name is None:
                    existing.name = name
                    name_backfilled.append(email)
                else:
                    skipped.append(email)
                continue
            db.add(
                User(
                    email=email,
                    name=name,
                    password_hash=hash_password(password),
                    role=role,
                    active=True,
                )
            )
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
