# ==============================================================================
# SkyResQ: Autonomous Aerial Search & Rescue AI Mission Platform
# Production Docker Image for Render Docker Service or Cloud Deployments
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000 \
    SKYRESQ_ENV=production \
    PYTHONPATH=/app

# Install system dependencies required for OpenCV, PyTorch, and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application layers
COPY ai /app/ai
COPY backend /app/backend
COPY frontend /app/frontend

# Pre-create operational persistence directories
RUN mkdir -p /app/media/uploads /app/media/detections /app/backend/data /app/data

WORKDIR /app/backend

EXPOSE 8000

# Launch full-stack unified FastAPI backend with dynamic port
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
