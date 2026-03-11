import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Configuração de logs para ver erros no Railway
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import sys

# Nuclear path fix: garanta que a raiz do projeto esteja no path
base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(base_dir, ".."))
if root_dir not in sys.path:
    sys.path.append(root_dir)
if base_dir not in sys.path:
    sys.path.append(base_dir)

# Importações locais do projeto
# Como rodamos da raiz, usamos o caminho completo ou relativo
try:
    from . import models
    from .database import engine, Base
    from .routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    logger.info("Importações de roteadores (relativas) OK.")
except Exception as e:
    logger.warning(f"Erro em importação relativa, tentando absoluta: {e}")
    import models
    from database import engine, Base
    from routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    logger.info("Importações de roteadores (absolutas) OK.")

app = FastAPI(title="Caria IA API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialização do Banco de Dados
@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Iniciando tabelas do banco de dados...")
        models.Base.metadata.create_all(bind=engine)
        logger.info("Banco de dados pronto.")
    except Exception as e:
        logger.error(f"Erro ao iniciar banco de dados: {e}")

# Rotas da API
try:
    logger.info("Registrando roteadores...")
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
    app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
    app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
    app.include_router(ai.router, prefix="/api/ai", tags=["AI Advisor"])
    app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])
    app.include_router(cards.router, prefix="/api/cards", tags=["Cards"])
    app.include_router(investments.router, prefix="/api/investments", tags=["Investments"])
    app.include_router(gamification.router, prefix="/api/gamification", tags=["Gamification"])
    app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
    app.include_router(control.router, prefix="/api/control", tags=["Control"])
    logger.info("Todos os roteadores foram registrados com sucesso.")
except Exception as e:
    logger.error(f"ERRO CRÍTICO AO REGISTRAR ROTEADORES: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": "production"}

# Montagem do Frontend
base_dir = os.path.dirname(__file__)
uploads_dir = os.path.join(base_dir, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Montar o frontend na raiz
frontend_dir = os.path.abspath(os.path.join(base_dir, "..", "frontend"))
if os.path.exists(frontend_dir):
    logger.info(f"Montando frontend em: {frontend_dir}")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    logger.error(f"ERRO: Pasta frontend NÃO encontrada em: {frontend_dir}")


