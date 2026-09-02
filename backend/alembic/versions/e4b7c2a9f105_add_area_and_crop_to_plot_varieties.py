"""add_area_and_crop_to_plot_varieties

Revision ID: e4b7c2a9f105
Revises: 9d2f6a1c8b3e
Create Date: 2026-09-03 00:00:00.000001

Two additions to plot_varieties, both while this table is already being
touched for the multi-variety frontend work:

1. `area_acres` (nullable) — a variety occupies part of the plot's total
   area, not all of it. Lab sampling's area/yield figures are per-variety;
   without this, a 4-acre plot split across two varieties would have both
   inheriting the full 4 acres wherever anything reads/auto-fills from it.
   Nullable — field measurement is imprecise and workers won't always
   subdivide acreage cleanly at registration time. Not validated against
   plots.area_acres at the DB level — the UI flags a soft warning if the
   sum across a plot's varieties exceeds the plot's stated total, but
   doesn't block on it, and an under-total is not flagged at all
   (unallocated/non-varietal area within a plot is normal).

2. `crop` — a single-value Postgres enum ('Grape') for forward
   compatibility only. CEO has confirmed pomegranate and banana are coming
   once grapes are done; requirements unknown, NOT built here (no crops
   table, no per-crop QC/pack-size/compliance config — see PHASE_MAP.md for
   what's deliberately unbuilt and what's still unanswered). variety_name
   is a free string with nothing distinguishing "Bhagwa" from "Thompson
   Seedless" once a second crop's rows start landing in this same table —
   every query that implicitly assumes grapes today would silently pick up
   the wrong rows. Not null, defaults to 'Grape', existing rows backfilled
   by the ADD COLUMN itself. No UI change — the form doesn't ask, since
   everything today is grapes; the column exists so "grape" stops being an
   implicit, unstated assumption. See app/core/enums.py::Crop.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4b7c2a9f105'
down_revision: Union[str, Sequence[str], None] = '9d2f6a1c8b3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('plot_varieties', sa.Column('area_acres', sa.Numeric(), nullable=True))

    # New enum type — created explicitly (not left to op.add_column to infer)
    # so this migration is unambiguous about what DDL it's issuing.
    crop_enum = sa.Enum('Grape', name='crop')
    crop_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'plot_varieties',
        sa.Column('crop', crop_enum, nullable=False, server_default='Grape'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('plot_varieties', 'crop')
    sa.Enum(name='crop').drop(op.get_bind(), checkfirst=True)
    op.drop_column('plot_varieties', 'area_acres')
