"""
Audit trail recording — called from any router mutation that needs to
appear in the Admin Audit Trail page (CLAUDE.md §5.2). Adds the row to the
current session WITHOUT committing; the caller's existing `db.commit()`
persists it atomically with the change it's logging, so an audit event
never exists for a change that itself failed to commit.
"""

from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.models.audit_event import AuditEvent
from app.models.user import User

# Matches frontend's permissions/permissions.ts::ROLE_LABELS exactly —
# the audit log shows the same human-readable label the rest of the UI does.
_ROLE_LABELS: dict[UserRole, str] = {
    UserRole.ADMIN: "Admin",
    UserRole.FIELD_WORKER: "Field Worker",
    UserRole.LAB_WORKER: "Lab Worker",
    UserRole.OFFICE_WORKER: "Office Worker",
    UserRole.STOCK_MANAGER: "Stock/Inventory Manager",
    UserRole.PACKAGING_SUPERVISOR: "Packaging Supervisor",
}


def record_audit_event(
    db: Session,
    actor: User,
    *,
    action: str,
    module: str,
    record_ref: str | None = None,
    result: str = "success",
    old_status: str | None = None,
    new_status: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        user_id=actor.id,
        user_name=actor.name or actor.email,
        role=_ROLE_LABELS.get(actor.role, str(actor.role)),
        action=action,
        module=module,
        record_ref=record_ref,
        result=result,
        old_status=old_status,
        new_status=new_status,
    )
    db.add(event)
    return event
