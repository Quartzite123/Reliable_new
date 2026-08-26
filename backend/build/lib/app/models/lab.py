"""
lab_samples — PHASE_MAP.md Section 7. One per season_registration, only
creatable after the latest field_qc has result=Pass (R18) — that gate is
enforced at the service layer, not here.

`lab_name` and `variety_confirmed` are plain Strings, not DB enums — same
reasoning as plots.variety (see plot.py docstring): PHASE_MAP.md's Labs
list (Section 8) is reference/seed data, not one of the 17 enums defined
in app/core/enums.py.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.core.enums import LabResult
from app.db.base import Base


def _values(enum_cls):
    return [member.value for member in enum_cls]


class LabSample(Base):
    __tablename__ = "lab_samples"

    id = Column(Integer, primary_key=True, index=True)
    season_registration_id = Column(
        Integer, ForeignKey("season_registrations.id"), unique=True, nullable=False
    )
    lab_name = Column(String, nullable=True)  # see module docstring — no Lab enum exists
    sampling_date = Column(Date, nullable=True)
    seal_no = Column(String, nullable=True)
    variety_confirmed = Column(String, nullable=True)  # lets lab flag mismatch without editing plot
    area_ha_2a = Column(Numeric, nullable=True)  # from 2A certificate document
    yield_4b_mt = Column(Numeric, nullable=True)
    seal_photo_url = Column(String, nullable=True)  # file upload
    documents_2a4b_url = Column(String, nullable=True)  # PDF upload
    remark = Column(Text, nullable=True)  # lab-side issues only
    tss_value = Column(Numeric, nullable=True)
    result = Column(SAEnum(LabResult, name="lab_result", values_callable=_values), nullable=False)
    entered_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    season_registration = relationship("SeasonRegistration", back_populates="lab_sample")
    entered_by_user = relationship(
        "User", back_populates="lab_samples_entered", foreign_keys=[entered_by]
    )
