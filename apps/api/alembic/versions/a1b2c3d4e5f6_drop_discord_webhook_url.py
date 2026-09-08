"""drop_discord_webhook_url

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-09-09 01:43:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if 'organizations' in existing_tables:
        cols = {c['name']: c for c in inspector.get_columns('organizations')}
        if 'discord_webhook_url' in cols:
            op.drop_column('organizations', 'discord_webhook_url')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if 'organizations' in existing_tables:
        cols = {c['name']: c for c in inspector.get_columns('organizations')}
        if 'discord_webhook_url' not in cols:
            op.add_column(
                'organizations',
                sa.Column('discord_webhook_url', sa.String(length=512), nullable=True)
            )
