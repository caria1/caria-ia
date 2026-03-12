import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Tratamento da DATABASE_URL para aceitar postgresql://
uri = os.getenv('DATABASE_URL')
if uri and uri.startswith('postgres://'):
    uri = uri.replace('postgres://', 'postgresql://', 1)

# Use essa 'uri' para criar o engine
SQLALCHEMY_DATABASE_URL = uri or "sqlite:///./backend/finance.db"

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,      # Verifica se a conexão está viva antes de usar
    pool_recycle=3600,       # Recicla conexões a cada hora
    pool_size=5,             # Tamanho do pool (ideal para free tier)
    max_overflow=10          # Permite picos controlados
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
