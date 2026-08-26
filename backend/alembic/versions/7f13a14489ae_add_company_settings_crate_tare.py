"""add_company_settings_crate_tare

Revision ID: 7f13a14489ae
Revises: 019061ee4d9d
Create Date: 2026-08-14 14:47:27.893380

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f13a14489ae'
down_revision: Union[str, Sequence[str], None] = '019061ee4d9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Phase 6 weighing: tare weight per empty crate. Falls back to 1.6 kg in
    # the weighing service when no company_settings row exists yet.
    op.add_column('company_settings', sa.Column('crate_tare_weight_kg', sa.Numeric(precision=4, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('company_settings', 'crate_tare_weight_kg')
