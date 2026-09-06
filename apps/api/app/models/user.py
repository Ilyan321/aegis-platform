import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Null for OAuth users
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), default="local", server_default="local", nullable=False)  # local, github, google
    provider_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    github_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    github_access_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization")

    def set_github_token(self, raw_token: Optional[str]) -> None:
        from app.core.crypto import encrypt_token_b64
        self.github_access_token = encrypt_token_b64(raw_token)

    def get_github_token(self) -> Optional[str]:
        from app.core.crypto import decrypt_token_b64
        return decrypt_token_b64(self.github_access_token)

