FROM python:3.10-slim

# Define o diretório de trabalho como raiz do projeto
WORKDIR /app

# Instala dependências do sistema para o PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas os requisitos primeiro para cache
COPY backend/requirements.txt ./backend/

# Instala as dependências do Python
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copia todo o projeto (backend e frontend)
COPY . .

# Define o PYTHONPATH para que os imports do backend funcionem
ENV PYTHONPATH=/app/backend

# Comando padrão (será sobrescrito pelo railway.toml ou Procfile se existirem)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
