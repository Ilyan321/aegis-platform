import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    github_repo_id: Mapped[int] = mapped_column(BigInteger, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    clone_url: Mapped[str] = mapped_column(String(512), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), default="main", nullable=False)
    webhook_secret: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    webhook_installed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="repositories")
    scan_runs = relationship(
        "ScanRun", back_populates="repository", cascade="all, delete-orphan"
    )
    incidents = relationship(
        "Incident", back_populates="repository", cascade="all, delete-orphan"
    )
