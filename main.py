import logging
import os
import sys
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Caminho Base
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

app = FastAPI(title="Caria IA")

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Logging de Requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} ({duration:.2f}s)")
    return response

# 3. Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "msg": "Caria IA Online"}

# 4. Inicialização dos Módulos (Caminhos Absolutos)
from backend.database import engine
from backend import models
from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control

# Evento de Startup para estabilidade
@app.on_event("startup")
def startup_event():
    logger.info("Executando tarefas de inicialização...")
    try:
        # Criar Tabelas
        models.Base.metadata.create_all(bind=engine)
        logger.info("Tabelas do Banco de Dados verificadas/criadas.")
    except Exception as e:
        logger.error(f"Erro no startup: {e}")

# Registrar Roteadores
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

# 5. Frontend & SPA (Arquivos Estáticos)
frontend_dir = os.path.join(current_dir, "frontend")
uploads_dir = os.path.join(current_dir, "backend", "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# Servir Uploads
app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# SPA Handler: Resolve o problema do F5 (Refresh)
@app.exception_handler(StarletteHTTPException)
async def spa_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api"):
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

# Mount Principal (Deve ser o último)
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info("Frontend montado com sucesso.")
