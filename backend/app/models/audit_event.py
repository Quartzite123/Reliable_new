"""
audit_events — immutable log of admin/system actions across the app
(CLAUDE.md §5.2, Business_Rules R30/R54). Backs the Admin "Audit Trail"
page.

`user_name` and `role` are snapshotted at the time of the event rather
than joined live from `users` — an audit trail should show what was true
when the action happened, not what's true now (e.g. if the actor's name
or role display label changes later, past events keep their original
values). See app/services/audit.py for how rows get written.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # human-readable label snapshot, e.g. "Admin"
    action = Column(String, nullable=False)  # e.g. "User created"
    module = Column(String, nullable=False)  # e.g. "Users", "Seasons"
    record_ref = Column(String, nullable=True)
    result = Column(String, nullable=False)  # 'success' | 'fail'
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
