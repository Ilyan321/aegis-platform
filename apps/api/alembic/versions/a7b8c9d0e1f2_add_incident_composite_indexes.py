"""add_incident_composite_indexes

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-09-06 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_incidents_repo_status_last_seen',
        'incidents',
        ['repository_id', 'status', 'last_seen_at'],
        unique=False
    )
    op.create_index(
        'ix_incidents_status_severity_last_seen',
        'incidents',
        ['status', 'severity', 'last_seen_at'],
        unique=False
    )
    op.create_index(
        'ix_incidents_verification_status',
        'incidents',
        ['verification_status'],
        unique=False
    )
    op.create_index(
        'ix_incidents_last_seen_at',
        'incidents',
        ['last_seen_at'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_incidents_last_seen_at', table_name='incidents')
    op.drop_index('ix_incidents_verification_status', table_name='incidents')
    op.drop_index('ix_incidents_status_severity_last_seen', table_name='incidents')
    op.drop_index('ix_incidents_repo_status_last_seen', table_name='incidents')
