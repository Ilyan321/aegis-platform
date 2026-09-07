"""add_client_ip_and_hashes_to_incident_audits

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-08 02:18:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if 'incident_audits' in existing_tables:
        cols = {c['name']: c for c in inspector.get_columns('incident_audits')}
        if 'client_ip' not in cols:
            op.add_column('incident_audits', sa.Column('client_ip', sa.String(length=45), nullable=True))
        if 'previous_hash' not in cols:
            op.add_column('incident_audits', sa.Column('previous_hash', sa.String(length=64), nullable=True))
        if 'entry_hash' not in cols:
            op.add_column('incident_audits', sa.Column('entry_hash', sa.String(length=64), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if 'incident_audits' in existing_tables:
        cols = {c['name']: c for c in inspector.get_columns('incident_audits')}
        if 'entry_hash' in cols:
            op.drop_column('incident_audits', 'entry_hash')
        if 'previous_hash' in cols:
            op.drop_column('incident_audits', 'previous_hash')
        if 'client_ip' in cols:
            op.drop_column('incident_audits', 'client_ip')
