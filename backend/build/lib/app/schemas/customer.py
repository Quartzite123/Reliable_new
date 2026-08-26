"""Schemas for customers + company settings (setup data)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    code: str | None = Field(default=None, description="Short code used in Lot IDs, e.g. 'OFD'")


class CustomerUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class CustomerRead(ORMModel):
    id: int
    name: str
    code: str | None
    is_active: bool
    created_at: datetime


class CompanySettingsUpdate(BaseModel):
    company_name: str | None = None
    company_address: str | None = None
    company_phone: str | None = None
    company_gst_number: str | None = None
    company_email: str | None = None
    ggn_number: str | None = None


class CompanySettingsRead(ORMModel):
    id: int
    company_name: str | None
    company_address: str | None
    company_phone: str | None
    company_gst_number: str | None
    company_email: str | None
    ggn_number: str | None
    updated_by: int | None
    updated_at: datetime
