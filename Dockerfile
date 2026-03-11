FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# O Railway vai rodar a partir da raiz
WORKDIR /app

# PYTHONPATH garante que 'backend' seja tratado como um pacote
ENV PYTHONPATH=/app/backend:/app

# Porta injetada pelo Railway
ENV PORT=8080

# Usamos backend.main:app pois o WORKDIR é a raiz
CMD uvicorn backend.main:app --proxy-headers --host 0.0.0.0 --port $PORT
