import uuid
from datetime import datetime
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        UniqueConstraint("repository_id", "fingerprint", name="uq_repo_fingerprint"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scan_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scan_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    fingerprint: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )  # SHA256(repo_id:rule_id:file_path:secret_hash)
    secret_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )  # HMAC-SHA256 blind index
    encrypted_secret_blob: Mapped[bytes] = mapped_column(
        LargeBinary, nullable=True
    )  # AES-256-GCM
    rule_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # CRITICAL, HIGH, MEDIUM, LOW
    status: Mapped[str] = mapped_column(
        String(50), default="OPEN", nullable=False
    )  # OPEN, RESOLVED, REGRESSION
    verification_status: Mapped[str] = mapped_column(
        String(50), default="NOT_VERIFIED", nullable=False
    )  # ACTIVE, REVOKED, UNVERIFIABLE, SKIPPED, ERROR, NOT_VERIFIED
    verification_details: Mapped[str] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    masked_snippet: Mapped[str] = mapped_column(String(255), nullable=False)
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    committer_handle: Mapped[str] = mapped_column(String(255), nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    repository = relationship("Repository", back_populates="incidents")
    scan_run = relationship("ScanRun", back_populates="incidents")
    audits = relationship(
        "IncidentAudit", back_populates="incident", cascade="all, delete-orphan"
    )
