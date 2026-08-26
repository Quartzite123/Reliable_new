"""
user_phase_access — maps users to the specific phases (screens) they can
access. `users.role` is a display label only; actual screen access is
determined entirely by this table (CLAUDE.md §4.9/§12, Business_Rules
R53/R58). Admin assigns any combination of the 14 phases to any user via
checkboxes in the frontend's Users admin page.
"""

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.enums import PhaseKey
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class UserPhaseAccess(Base):
    __tablename__ = "user_phase_access"
    __table_args__ = (
        UniqueConstraint("user_id", "phase_key", name="uq_user_phase_access_user_phase"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    phase_key = Column(SAEnum(PhaseKey, name="phase_key", values_callable=_values), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    user = relationship("User", back_populates="phase_access")
