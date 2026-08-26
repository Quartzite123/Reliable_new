"""Tiny shared schema helpers."""

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base for all *Read schemas — enables loading from ORM objects."""

    model_config = ConfigDict(from_attributes=True)
