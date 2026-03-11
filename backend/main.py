import logging
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Garante que a raiz do projeto esteja no path para imports absolutos
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.append(root_dir)

app = FastAPI(title="Caria IA API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importações Absolutas (Garante funcionamento no Railway)
try:
    from backend import models
    from backend.database import engine, Base
    from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    logger.info("Importações via 'backend.xxxx' OK.")
except ImportError as e:
    logger.warning(f"Erro em importação absoluta: {e}. Tentando relativa...")
    import models
    from database import engine, Base
    from routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": "production"}

# RESOLUÇÃO DO FRONTEND (Caminhos absolutos para o Docker)
# No Dockerfile, o WORKDIR é /app. Logo, o frontend está em /app/frontend
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = "/app/frontend"

# Fallback para local
if not os.path.exists(frontend_dir):
    frontend_dir = os.path.abspath(os.path.join(current_dir, "..", "frontend"))

uploads_dir = "/app/backend/uploads"
if not os.path.exists(uploads_dir):
    uploads_dir = os.path.join(current_dir, "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# Debug endpoint para ver no Railway se os arquivos estão lá
@app.get("/api/debug/paths")
def debug_paths():
    return {
        "cwd": os.getcwd(),
        "frontend_path": frontend_dir,
        "frontend_exists": os.path.exists(frontend_dir),
        "frontend_files": os.listdir(frontend_dir) if os.path.exists(frontend_dir) else [],
        "python_path": sys.path
    }

# Rota explícita para o index.html
@app.get("/")
async def serve_index():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Frontend files not found", "path_searched": index_file}

# Mount para arquivos estáticos (CSS, JS)
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"Frontend montado de: {frontend_dir}")
else:
    logger.error(f"ERRO CRÍTICO: Pasta frontend não encontrada em {frontend_dir}")

app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")


