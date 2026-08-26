"""
GET /api/v1/audit-log — Admin-only. Every recorded action across the
system, most recent first. Events are written by app/services/audit.py
from other routers (currently: user create/status-change/phases-change/
delete, season create/edit — see BACKEND_CHANGELOG.md for the full list).

Query filters match the frontend's `AuditLogFilters` exactly (see
features/auditLog/types.ts): user_id, role, module, action, result,
date_from, date_to.
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.deps import require_role
from app.models.audit_event import AuditEvent
from app.schemas.audit_event import AuditEventRead

router = APIRouter()

_admin_only = Depends(require_role())


@router.get("", response_model=list[AuditEventRead], dependencies=[_admin_only])
def list_audit_events(
    db: Session = Depends(get_db),
    user_id: int | None = None,
    role: str | None = None,
    module: str | None = None,
    action: str | None = None,
    result: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    stmt = select(AuditEvent).order_by(AuditEvent.timestamp.desc())
    if user_id is not None:
        stmt = stmt.where(AuditEvent.user_id == user_id)
    if role is not None:
        stmt = stmt.where(AuditEvent.role == role)
    if module is not None:
        stmt = stmt.where(AuditEvent.module == module)
    if action is not None:
        stmt = stmt.where(AuditEvent.action == action)
    if result is not None:
        stmt = stmt.where(AuditEvent.result == result)
    if date_from is not None:
        stmt = stmt.where(AuditEvent.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to is not None:
        stmt = stmt.where(AuditEvent.timestamp <= datetime.combine(date_to, datetime.max.time()))
    return list(db.scalars(stmt))
