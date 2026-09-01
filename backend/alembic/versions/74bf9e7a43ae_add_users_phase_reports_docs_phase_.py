"""add_users_phase_reports_docs_phase_mobile

Revision ID: 74bf9e7a43ae
Revises: 5ac168de2810
Create Date: 2026-09-01 00:00:00.000000

Two additions for the admin user-management overhaul (2026-09-01):

1. `users` and `reports_documents` added to the `phase_key` Postgres enum.
   `users` is the new user-management phase, split out of the previous
   admin-does-everything model (see app/services/user_admin_guard.py for
   the actual security boundary — the phase gate alone is not the whole
   story). `reports_documents` is a placeholder, same pattern as
   `finished_goods_qc` — gates nothing until the Reports/Export Documents
   modules are built.
2. `users.mobile` — nullable (existing rows have no value on file yet;
   required going forward via UserCreate's Pydantic validation, not a DB
   constraint — same rollout pattern `name` used). Not unique — follows
   the farmers.mobile precedent (indexed-but-not-unique reference data,
   no stated business need to prevent two accounts sharing a number).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74bf9e7a43ae'
down_revision: Union[str, Sequence[str], None] = '5ac168de2810'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Postgres requires ADD VALUE to run outside the migration's transaction.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE phase_key ADD VALUE IF NOT EXISTS 'users'")
        op.execute("ALTER TYPE phase_key ADD VALUE IF NOT EXISTS 'reports_documents'")

    op.add_column('users', sa.Column('mobile', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema.

    Note: Postgres has no ALTER TYPE ... DROP VALUE — removing 'users' and
    'reports_documents' from phase_key on downgrade is not supported (same
    limitation as the packaging_supervisor addition to user_role earlier
    in this history). Any user_phase_access rows using them would need to
    be deleted first, then the enum type recreated entirely. Left as a
    manual step if this migration is ever rolled back.
    """
    op.drop_column('users', 'mobile')
