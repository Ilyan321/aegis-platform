"""add_org_webhooks_and_repo_webhook_installed

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-09-06 20:23:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    org_cols = [c['name'] for c in inspector.get_columns('organizations')]

    # 1. Add alert webhook URLs to organizations
    if 'slack_webhook_url' not in org_cols:
        op.add_column(
            'organizations',
            sa.Column('slack_webhook_url', sa.String(length=512), nullable=True)
        )
    if 'discord_webhook_url' not in org_cols:
        op.add_column(
            'organizations',
            sa.Column('discord_webhook_url', sa.String(length=512), nullable=True)
        )

    # 2. Add webhook_installed to repositories
    repo_cols = [c['name'] for c in inspector.get_columns('repositories')]
    if 'webhook_installed' not in repo_cols:
        op.add_column(
            'repositories',
            sa.Column('webhook_installed', sa.Boolean(), server_default='false', nullable=False)
        )


def downgrade() -> None:
    op.drop_column('repositories', 'webhook_installed')
    op.drop_column('organizations', 'discord_webhook_url')
    op.drop_column('organizations', 'slack_webhook_url')
