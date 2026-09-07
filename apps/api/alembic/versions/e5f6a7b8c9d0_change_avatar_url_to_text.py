"""change_avatar_url_to_text

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-08 01:27:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c['name']: c for c in inspector.get_columns('users')}
    if 'avatar_url' in cols:
        op.alter_column(
            'users',
            'avatar_url',
            existing_type=sa.String(length=1024),
            type_=sa.Text(),
            existing_nullable=True
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c['name']: c for c in inspector.get_columns('users')}
    if 'avatar_url' in cols:
        op.alter_column(
            'users',
            'avatar_url',
            existing_type=sa.Text(),
            type_=sa.String(length=1024),
            existing_nullable=True
        )
