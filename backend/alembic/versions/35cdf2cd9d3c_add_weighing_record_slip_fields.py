"""add_weighing_record_slip_fields

Revision ID: 35cdf2cd9d3c
Revises: 88e954c6a84c
Create Date: 2026-08-14 14:47:27.893380

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35cdf2cd9d3c'
down_revision: Union[str, Sequence[str], None] = '88e954c6a84c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Phase 6 weighing slip #937 addendum: slip-identifying fields, produce
    # type, average size/sugar, village/contact, the tare rate used for this
    # record (audit), and the actual (operator-entered) rejection % that sits
    # alongside the existing contract-snapshot `rejection_pct`.
    op.add_column('weighing_records', sa.Column('actual_rejection_pct', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('weighing_records', sa.Column('slip_serial_no', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('load_id', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('harvester_no', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('no_crt_reci', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('knitting', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('produce_type', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('average_size', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('average_sugar', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('weighing_records', sa.Column('village_name', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('contact_no', sa.String(), nullable=True))
    op.add_column('weighing_records', sa.Column('crate_tare_weight_kg', sa.Numeric(precision=4, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('weighing_records', 'crate_tare_weight_kg')
    op.drop_column('weighing_records', 'contact_no')
    op.drop_column('weighing_records', 'village_name')
    op.drop_column('weighing_records', 'average_sugar')
    op.drop_column('weighing_records', 'average_size')
    op.drop_column('weighing_records', 'produce_type')
    op.drop_column('weighing_records', 'knitting')
    op.drop_column('weighing_records', 'no_crt_reci')
    op.drop_column('weighing_records', 'harvester_no')
    op.drop_column('weighing_records', 'load_id')
    op.drop_column('weighing_records', 'slip_serial_no')
    op.drop_column('weighing_records', 'actual_rejection_pct')
