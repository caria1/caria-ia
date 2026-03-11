import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Detect PostgreSQL (Railway) or SQLite (Local)
# Se estiver no Railway, a URL começa com postgres:// ou postgresql://
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/finance.db")

# Railway fix: o SQLAlchemy exige postgresql:// em vez de postgres://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

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
