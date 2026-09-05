#!/bin/bash
set -e

echo "Starting Aegis API & Worker services..."

# Run database migrations if alembic is configured and DB is reachable
if [ -f "alembic.ini" ]; then
    echo "Running Alembic migrations..."
    alembic upgrade head || echo "Migration warning: Database may not be ready or migrations already applied"
fi

# Start Celery worker in background if REDIS_URL is provided
if [ -n "$REDIS_URL" ]; then
    echo "Starting Celery worker in background..."
    celery -A app.core.celery_app worker --loglevel=info --concurrency=2 &
fi

# Start FastAPI server
PORT_NUM=${PORT:-8000}
echo "Starting Uvicorn web server on port $PORT_NUM..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT_NUM"
