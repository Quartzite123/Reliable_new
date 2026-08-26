"""remove_farmer_mh_number_rename_plot_mh_code

Revision ID: 4f78801a91fd
Revises: ee800d0eaf23
Create Date: 2026-08-09 14:45:58.644277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f78801a91fd'
down_revision: Union[str, Sequence[str], None] = 'ee800d0eaf23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # farmers.mh_number is being removed outright (APEDA correction: MH
    # registration numbers are plot-level, not farmer-level — see CLAUDE.md
    # Section 12).
    op.drop_index(op.f('ix_farmers_mh_number'), table_name='farmers')
    op.drop_column('farmers', 'mh_number')

    # plots.plot_mh_code is a rename to mh_registration_number, not a
    # drop+add — hand-edited from autogenerate's default output so existing
    # values are preserved instead of discarded on upgrade.
    op.alter_column('plots', 'plot_mh_code', new_column_name='mh_registration_number')
    op.create_unique_constraint(
        'uq_plots_mh_registration_number', 'plots', ['mh_registration_number']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_plots_mh_registration_number', 'plots', type_='unique')
    op.alter_column('plots', 'mh_registration_number', new_column_name='plot_mh_code')

    op.add_column('farmers', sa.Column('mh_number', sa.VARCHAR(), autoincrement=False, nullable=False))
    op.create_index(op.f('ix_farmers_mh_number'), 'farmers', ['mh_number'], unique=True)
