FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# O Railway vai rodar a partir daqui
WORKDIR /app/backend

# PYTHONPATH garante que os imports locais funcionem
ENV PYTHONPATH=/app/backend

# Porta injetada pelo Railway
ENV PORT=8080

# Usamos uvicorn main:app pois estamos dentro da pasta backend
CMD uvicorn main:app --proxy-headers --host 0.0.0.0 --port $PORT
