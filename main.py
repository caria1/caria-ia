import logging
import os
import sys
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Configuração de logs para ver no Railway
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

# 1. Logging Middleware - Veja cada requisição no console do Railway
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.2f}s")
    return response

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Importações e Inicialização
try:
    from backend.database import engine
    from backend import models
    from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    
    # Criar tabelas
    models.Base.metadata.create_all(bind=engine)
    logger.info("Banco de Dados OK.")

    # 4. API Routers (Devem vir ANTES do Mount "/")
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
    logger.info("Roteadores carregados com sucesso.")

except Exception as e:
    logger.error(f"ERRO CRÍTICO NA INICIALIZAÇÃO: {e}")
    # Não vamos travar o app para permitir health checks
    @app.get("/api/error")
    def debug_error():
        return {"error": str(e)}

# 5. Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "msg": "Caria IA Online"}

# 6. RESOLUÇÃO FRONTEND & SPA (Fix F5/Refresh)
frontend_dir = os.path.join(current_dir, "frontend")
uploads_dir = os.path.join(current_dir, "backend", "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# Servir uploads explicitamente
app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# SPA Handler: Se der 404 e não for /api, manda para o index.html
@app.exception_handler(StarletteHTTPException)
async def spa_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api"):
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

# Mount Final para arquivos estáticos
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"Frontend servido de: {frontend_dir}")
else:
    logger.error(f"AVISO: Pasta frontend não encontrada em {frontend_dir}")
