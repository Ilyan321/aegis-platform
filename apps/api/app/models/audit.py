import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class IncidentAudit(Base):
    __tablename__ = "incident_audits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # "SYSTEM", "WORKER", user handle, or API key
    action: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # "DETECTED", "VERIFIED_ACTIVE", "AUTO_RESOLVED", "REGRESSION_DETECTED", "MANUAL_DISMISS"
    previous_state: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    new_state: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    incident = relationship("Incident", back_populates="audits")
