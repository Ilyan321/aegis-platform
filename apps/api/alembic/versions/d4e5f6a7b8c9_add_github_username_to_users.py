"""add_github_username_to_users

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-07 00:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('users')]
    if 'github_username' not in cols:
        op.add_column(
            'users',
            sa.Column('github_username', sa.String(length=100), nullable=True)
        )
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_github_username' not in existing_indexes:
        op.create_index(
            'ix_users_github_username',
            'users',
            ['github_username'],
            unique=False
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_github_username' in existing_indexes:
        op.drop_index('ix_users_github_username', table_name='users')
    cols = [c['name'] for c in inspector.get_columns('users')]
    if 'github_username' in cols:
        op.drop_column('users', 'github_username')
