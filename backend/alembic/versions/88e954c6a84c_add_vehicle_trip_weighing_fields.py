"""add_vehicle_trip_weighing_fields

Revision ID: 88e954c6a84c
Revises: 7f13a14489ae
Create Date: 2026-08-14 14:47:27.893380

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88e954c6a84c'
down_revision: Union[str, Sequence[str], None] = '7f13a14489ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Phase 6 weighing-time actuals (weighing slip #937) — nullable, filled
    # at weighing time. Harvest-time estimates (num_crates, approx_weight_kg)
    # are untouched by this migration.
    op.add_column('vehicle_trips', sa.Column('crate_count_at_weighing', sa.Integer(), nullable=True))
    op.add_column('vehicle_trips', sa.Column('gross_weight_kg', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('vehicle_trips', sa.Column('tare_weight_kg', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('vehicle_trips', sa.Column('net_fruit_weight_kg', sa.Numeric(precision=8, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('vehicle_trips', 'net_fruit_weight_kg')
    op.drop_column('vehicle_trips', 'tare_weight_kg')
    op.drop_column('vehicle_trips', 'gross_weight_kg')
    op.drop_column('vehicle_trips', 'crate_count_at_weighing')
