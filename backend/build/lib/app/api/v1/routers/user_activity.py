"""
GET /api/v1/user-activity — Admin-only login/session activity per user.

Backs the admin "User Activity" dashboard. Not a phase in PHASE_MAP.md —
a cross-cutting admin/audit view over the login bookkeeping columns on
`users` (last_login_at, last_logout_at, last_activity_at,
failed_login_count, last_failed_login_at), written by POST /auth/login
and POST /auth/logout.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_role
from app.models.user import User
from app.schemas.user import UserActivityRead

router = APIRouter()

_admin_only = Depends(require_role())  # require_role() with no args = Admin only


@router.get("", response_model=list[UserActivityRead], dependencies=[_admin_only])
def list_user_activity(db: Session = Depends(get_db)) -> list[UserActivityRead]:
    users = db.scalars(select(User).order_by(User.id)).all()
    return [
        UserActivityRead(
            user_id=u.id,
            name=u.name,
            email=u.email,
            roles=[u.role],
            active=u.active,
            last_login_at=u.last_login_at,
            last_logout_at=u.last_logout_at,
            last_activity_at=u.last_activity_at,
            failed_login_count=u.failed_login_count,
            last_failed_login_at=u.last_failed_login_at,
        )
        for u in users
    ]
