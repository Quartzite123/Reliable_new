"""Schema for the Admin Audit Trail (GET /audit-log)."""

from datetime import datetime
from typing import Literal

from app.schemas.common import ORMModel

AuditResult = Literal["success", "fail"]


class AuditEventRead(ORMModel):
    id: int
    timestamp: datetime
    user_id: int | None = None
    user_name: str
    role: str
    action: str
    module: str
    record_ref: str | None = None
    result: AuditResult
    old_status: str | None = None
    new_status: str | None = None
