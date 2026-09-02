"""registration_unique_per_plot_variety

Revision ID: 9d2f6a1c8b3e
Revises: 74bf9e7a43ae
Create Date: 2026-09-03 00:00:00.000000

Multi-variety-per-plot frontend work: season_registrations must allow more
than one row per (plot, season) — one per variety a plot carries — so the
uniqueness guarantee moves from (plot_id, season_year) to
(plot_variety_id, season_year). Nothing about registering a second variety
on a plot can work until this lands.

Backfill, in order (re-derived via SELECT at migration time, not hardcoded
to what this file's author found on one particular database):

1. For every plot whose `variety` has no matching row in plot_varieties
   yet, create one. (Checked against the live DB before writing this: 16 of
   17 plots already had a matching plot_varieties row from an earlier
   seeding pass; only one plot needed a row created here. The query below
   doesn't assume that — it finds whatever gap actually exists.)
2. For every season_registration with plot_variety_id still NULL, point it
   at the plot_varieties row matching its own plot's current `variety`
   (guaranteed to exist after step 1).
3. Guard: abort loudly if any registration still has no plot_variety_id
   after that — the only way that happens is a plot with variety IS NULL,
   which the frontend form doesn't allow but the DB column itself doesn't
   forbid. Better to stop here than silently corrupt data or fail the NOT
   NULL step below with a less legible error.
4. Make plot_variety_id NOT NULL.
5. Drop the old (plot_id, season_year) constraint, add the new
   (plot_variety_id, season_year) one.

plot_id stays on season_registrations — denormalized, derivable via
plot_varieties.plot_id, kept for query convenience only.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d2f6a1c8b3e'
down_revision: Union[str, Sequence[str], None] = '74bf9e7a43ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Backfill plot_varieties from plots.variety wherever no matching row
    # exists yet. plots.variety itself is untouched — it stays in place as
    # legacy/denormalized data (see models/plot.py's comment on it).
    #
    # No `crop` column reference here on purpose — this migration runs
    # before the next one (e4b7c2a9f105) adds plot_varieties.crop. Any row
    # inserted here picks up that column's NOT NULL default ('Grape') the
    # same way every pre-existing plot_varieties row does, when that
    # migration runs.
    op.execute("""
        INSERT INTO plot_varieties (plot_id, variety_name, created_at)
        SELECT p.id, p.variety, now()
        FROM plots p
        WHERE p.variety IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM plot_varieties pv
              WHERE pv.plot_id = p.id AND pv.variety_name = p.variety
          )
    """)

    # 2. Point every still-unlinked registration at its plot's (now
    # guaranteed to exist) plot_varieties row.
    op.execute("""
        UPDATE season_registrations sr
        SET plot_variety_id = pv.id
        FROM plots p, plot_varieties pv
        WHERE sr.plot_variety_id IS NULL
          AND p.id = sr.plot_id
          AND pv.plot_id = p.id
          AND pv.variety_name = p.variety
    """)

    # 3. Guard — fail loudly rather than let the NOT NULL step below produce
    # a confusing IntegrityError, or worse, rather than silently proceeding
    # with an unmigrated row.
    conn = op.get_bind()
    still_null = conn.execute(
        sa.text("SELECT count(*) FROM season_registrations WHERE plot_variety_id IS NULL")
    ).scalar()
    if still_null:
        raise RuntimeError(
            f"{still_null} season_registrations row(s) still have no plot_variety_id after "
            "backfill — almost certainly a plot with variety IS NULL. Resolve manually "
            "(give that plot a real variety, or a plot_varieties row directly) before "
            "re-running this migration."
        )

    # 4. Every registration now has a variety — enforce it.
    op.alter_column('season_registrations', 'plot_variety_id', nullable=False)

    # 5. Move the uniqueness guarantee from the plot to the plot+variety.
    op.drop_constraint('uq_season_registrations_plot_season', 'season_registrations', type_='unique')
    op.create_unique_constraint(
        'uq_season_registrations_plot_variety_season',
        'season_registrations',
        ['plot_variety_id', 'season_year'],
    )


def downgrade() -> None:
    """Downgrade schema.

    Backfilled plot_varieties rows and the plot_variety_id links they
    created are left in place — they're additive and harmless once the old
    (plot_id, season_year) constraint is back in effect. Nothing downstream
    of this migration alone treats plot_variety_id as load-bearing.
    """
    op.drop_constraint('uq_season_registrations_plot_variety_season', 'season_registrations', type_='unique')
    op.create_unique_constraint(
        'uq_season_registrations_plot_season', 'season_registrations', ['plot_id', 'season_year']
    )
    op.alter_column('season_registrations', 'plot_variety_id', nullable=True)
