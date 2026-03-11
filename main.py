import logging
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Configuração de logs para ver erros no Railway
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Garante que as pastas raiz e backend sejam importáveis
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")

if current_dir not in sys.path:
    sys.path.append(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

app = FastAPI(title="Caria IA")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check (sempre disponível)
@app.get("/api/health")
def health_check():
    return {"status": "ok", "msg": "Caria IA está online!"}

# Importações e Registro de Rotas - SEM TRY/EXCEPT para ver o erro real se falhar
from backend.database import engine
from backend import models
from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Verificando Banco de Dados...")
        models.Base.metadata.create_all(bind=engine)
        logger.info("Banco de Dados OK.")
    except Exception as e:
        logger.error(f"Erro no Banco de Dados: {e}")

# Registra rotas da API
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
logger.info("Roteadores registrados com sucesso.")

# Servindo o Frontend
frontend_dir = os.path.join(current_dir, "frontend")
uploads_dir = os.path.join(current_dir, "backend", "uploads")
os.makedirs(uploads_dir, exist_ok=True)

@app.get("/")
async def serve_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not found", "path": index_path}

if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"Frontend servido de: {frontend_dir}")

app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")
