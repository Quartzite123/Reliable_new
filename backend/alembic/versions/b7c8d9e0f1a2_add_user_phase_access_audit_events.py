"""add_user_phase_access_audit_events_packaging_supervisor

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-08-23 01:00:00.000000

Three additions to bring the backend in line with the (already-built)
frontend admin panel — the frontend's phase-checkbox user management and
Audit Trail page had no backend support until now:

1. `user_phase_access` table — the actual permission mechanism.
   `users.role` remains a display label only (CLAUDE.md §4.9/§12,
   Business_Rules R53/R58). Without this table, `GET /users*` never
   returns a `phases` field, and the frontend's `useVisibleNav` treats a
   missing `phases` as "no access to anything" — every user saw an empty
   nav menu against the real backend before this migration.
2. `audit_events` table — backs GET /audit-log (Admin Audit Trail page).
3. `packaging_supervisor` added to the `user_role` Postgres enum — the
   frontend's Role type has had this value since the Phase 6/team-2
   merge, but the backend enum never picked it up.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PHASE_KEYS = [
    'farmer_registration',
    'plot_registration',
    'field_qc',
    'lab_sampling',
    'farmer_contract',
    'harvesting',
    'weighing',
    'arrival_qc',
    'packaging',
    'inventory_management',
    'palletisation',
    'pre_cooling',
    'finished_goods_qc',
    'admin',
]


def upgrade() -> None:
    """Upgrade schema."""
    # --- 1. user_phase_access table ---
    op.create_table(
        'user_phase_access',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('phase_key', sa.Enum(*PHASE_KEYS, name='phase_key'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'phase_key', name='uq_user_phase_access_user_phase'),
    )
    op.create_index(op.f('ix_user_phase_access_id'), 'user_phase_access', ['id'], unique=False)

    # --- 2. audit_events table ---
    op.create_table(
        'audit_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('module', sa.String(), nullable=False),
        sa.Column('record_ref', sa.String(), nullable=True),
        sa.Column('result', sa.String(), nullable=False),
        sa.Column('old_status', sa.String(), nullable=True),
        sa.Column('new_status', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_events_id'), 'audit_events', ['id'], unique=False)
    op.create_index(op.f('ix_audit_events_timestamp'), 'audit_events', ['timestamp'], unique=False)

    # --- 3. packaging_supervisor added to user_role enum ---
    # Postgres requires ADD VALUE to run outside the migration's transaction.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'packaging_supervisor'")


def downgrade() -> None:
    """Downgrade schema.

    Note: Postgres has no ALTER TYPE ... DROP VALUE, so removing
    'packaging_supervisor' from user_role on downgrade is not supported —
    any rows using it would need to be reassigned a different role first,
    then the enum type would need to be recreated entirely. Left as a
    manual step if this migration is ever rolled back.
    """
    op.drop_index(op.f('ix_audit_events_timestamp'), table_name='audit_events')
    op.drop_index(op.f('ix_audit_events_id'), table_name='audit_events')
    op.drop_table('audit_events')

    op.drop_index(op.f('ix_user_phase_access_id'), table_name='user_phase_access')
    op.drop_table('user_phase_access')

    op.execute("DROP TYPE IF EXISTS phase_key")
