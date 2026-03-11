import logging
import os
import sys
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Configuração de logs ULTRA detalhada
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração de caminhos
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

app = FastAPI(title="Caria IA")

# 1. Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} ({duration:.2f}s)")
        return response
    except Exception as e:
        logger.error(f"Erro na requisição {request.method} {request.url.path}: {e}")
        return JSONResponse({"detail": "Internal Server Error", "error": str(e)}, status_code=500)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Variável de erro global para diagnóstico
app_error = None

# Health Check (sempre disponível para o Railway não matar o container)
@app.get("/api/health")
def health_check():
    return {"status": "ok", "msg": "Caria IA está online!", "error_present": app_error is not None}

@app.get("/api/error")
def show_app_error():
    if app_error:
        return {"error": app_error}
    return {"msg": "Nenhum erro detectado na inicialização."}

@app.get("/api/debug/files")
def list_files():
    files = []
    for root, dirs, filenames in os.walk(current_dir):
        if "venv" in root or ".git" in root or "__pycache__" in root:
            continue
        for f in filenames:
            files.append(os.path.join(root, f).replace(current_dir, ""))
    return {"files": files}

# 4. Inicialização do Backend
try:
    logger.info("Iniciando carregamento dos módulos do backend...")
    from backend.database import engine
    from backend import models
    from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    
    # Registro de roteadores
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
    
    logger.info("Roteadores carregados. Criando tabelas no Banco de Dados...")
    models.Base.metadata.create_all(bind=engine)
    logger.info("Tabelas criadas com sucesso.")

except Exception as e:
    import traceback
    app_error = f"{str(e)}\n{traceback.format_exc()}"
    logger.error(f"FALHA NA INICIALIZAÇÃO: {app_error}")

# 5. Frontend & SPA Support
frontend_dir = os.path.join(current_dir, "frontend")
uploads_dir = os.path.join(current_dir, "backend", "uploads")
os.makedirs(uploads_dir, exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# SPA Handler (Redirect non-API 404s to index.html)
@app.exception_handler(StarletteHTTPException)
async def spa_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api"):
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

# Mount frontend
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"Frontend servido de: {frontend_dir}")
else:
    logger.error(f"ERRO: Pasta frontend não encontrada em {frontend_dir}")
