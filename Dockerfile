FROM python:3.12-slim

# Install system dependencies (git for cloning repos, ca-certificates, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Aegis CLI binary
COPY apps/api/bin/aegis /usr/local/bin/aegis
RUN chmod +x /usr/local/bin/aegis

# Install Python dependencies
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY apps/api/ .

RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
