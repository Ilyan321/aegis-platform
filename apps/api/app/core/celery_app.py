import ssl
from celery import Celery
from app.core.config import settings

redis_url = settings.REDIS_URL

# Configure Celery instance
celery_app = Celery(
    "aegis_worker",
    broker=redis_url,
    backend=redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per repository scan
    worker_prefetch_multiplier=1,
)

# If using rediss:// (Upstash TLS), configure SSL options
if redis_url.startswith("rediss://"):
    celery_app.conf.update(
        broker_use_ssl={
            "ssl_cert_reqs": ssl.CERT_NONE,
        },
        redis_backend_use_ssl={
            "ssl_cert_reqs": ssl.CERT_NONE,
        },
    )
