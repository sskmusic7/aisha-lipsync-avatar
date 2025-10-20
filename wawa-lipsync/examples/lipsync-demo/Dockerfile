# Simple Python backend for Fly.io
FROM python:3.10-slim

WORKDIR /app

# Install minimal dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Expose port
EXPOSE 8765

# Set environment
ENV PORT=8765

# Run the server
CMD ["python", "websocket_server.py"]