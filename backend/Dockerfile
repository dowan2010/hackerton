# =============================================================
# 🐍 RootHome Python FastAPI Backend - Serverless Cloud Run Deploy
# =============================================================

# 1. Use the highly optimized Python 3.11 slim image for fast boot and lightweight footprints
FROM python:3.11-slim

# 2. Set environment variables to optimize python execution inside Docker
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# 3. Set workspace directory inside container
WORKDIR /app

# 4. Pre-copy requirements and install dependencies with high-speed caching disabled
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the backend source files (main.py, schemas.py, services, data)
COPY . .

# 6. Expose the serverless default communication port
EXPOSE 8080

# 7. Start FastAPI web server using uvicorn binding dynamic Cloud Run PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
