"""add_password_changed_at

Revision ID: 5ac168de2810
Revises: b7c8d9e0f1a2
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5ac168de2810'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default=now() means every row gets today's timestamp on
    # migration — this deliberately invalidates every access/refresh token
    # issued before this migration ran (their `iat` predates it), since
    # nothing minted a token with an `iat` claim before this fix either.
    # One-time, expected: every user must log in again after this deploys.
    op.add_column(
        'users',
        sa.Column('password_changed_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'password_changed_at')
