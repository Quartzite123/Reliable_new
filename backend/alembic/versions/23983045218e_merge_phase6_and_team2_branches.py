"""merge_phase6_and_team2_branches

Revision ID: 23983045218e
Revises: 35cdf2cd9d3c, 2879f513c1dd
Create Date: 2026-08-22 18:54:17.841848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23983045218e'
down_revision: Union[str, Sequence[str], None] = ('35cdf2cd9d3c', '2879f513c1dd')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
