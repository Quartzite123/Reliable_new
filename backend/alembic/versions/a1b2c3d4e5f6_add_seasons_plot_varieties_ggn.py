"""add_seasons_plot_varieties_ggn_number

Revision ID: a1b2c3d4e5f6
Revises: 23983045218e
Create Date: 2026-08-23 00:00:00.000000

Three deployment-blocking additions:

1. `seasons` table — Phase 0, admin-managed season entity (R55). Shape
   (year/status/notes, not name/is_active) matches the frontend's
   `features/seasons` module — see BACKEND_CHANGELOG.md.
2. `plot_varieties` table — multi-variety plots, each variety gets its own
   pipeline (R57)
3. `farmers.ggn_number` — GlobalG.A.P. number per farmer
4. `season_registrations.season_id` — FK to seasons (nullable, alongside
   legacy season_year for backward compat)
5. `season_registrations.plot_variety_id` — FK to plot_varieties (nullable,
   alongside legacy plot_id)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '23983045218e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # --- 1. seasons table ---
    op.create_table(
        'seasons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_seasons_id'), 'seasons', ['id'], unique=False)

    # --- 2. plot_varieties table ---
    op.create_table(
        'plot_varieties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plot_id', sa.Integer(), nullable=False),
        sa.Column('variety_name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['plot_id'], ['plots.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('plot_id', 'variety_name', name='uq_plot_varieties_plot_variety'),
    )
    op.create_index(op.f('ix_plot_varieties_id'), 'plot_varieties', ['id'], unique=False)

    # --- 3. farmers.ggn_number ---
    op.add_column('farmers', sa.Column('ggn_number', sa.String(), nullable=True))

    # --- 4. season_registrations.season_id FK ---
    op.add_column(
        'season_registrations',
        sa.Column('season_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_season_registrations_season_id',
        'season_registrations', 'seasons',
        ['season_id'], ['id'],
    )

    # --- 5. season_registrations.plot_variety_id FK ---
    op.add_column(
        'season_registrations',
        sa.Column('plot_variety_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_season_registrations_plot_variety_id',
        'season_registrations', 'plot_varieties',
        ['plot_variety_id'], ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove FKs and columns from season_registrations
    op.drop_constraint('fk_season_registrations_plot_variety_id', 'season_registrations', type_='foreignkey')
    op.drop_column('season_registrations', 'plot_variety_id')
    op.drop_constraint('fk_season_registrations_season_id', 'season_registrations', type_='foreignkey')
    op.drop_column('season_registrations', 'season_id')

    # Remove farmers.ggn_number
    op.drop_column('farmers', 'ggn_number')

    # Drop plot_varieties
    op.drop_index(op.f('ix_plot_varieties_id'), table_name='plot_varieties')
    op.drop_table('plot_varieties')

    # Drop seasons
    op.drop_index(op.f('ix_seasons_id'), table_name='seasons')
    op.drop_table('seasons')
