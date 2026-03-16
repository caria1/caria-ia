import logging, os, sys, time
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

app = FastAPI(title='Caria IA')
app.add_middleware(CORSMiddleware, allow_origin_regex='https://.*\.railway\.app|http://localhost:.*', allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/api/health')
def health():
    return {'status': 'ok'}

from backend.database import engine
from backend import models
from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control

@app.on_event("startup")
def startup_event():
    logger.info("Iniciando Caria IA...")
    try:
        models.Base.metadata.create_all(bind=engine)
        logger.info("Tabelas criadas com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao conectar ou criar tabelas no banco de dados: {e}")

@app.get("/api/test")
def test_connection():
    try:
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        return {"status": "success", "message": "Conexão com o banco de dados bem-sucedida."}
    except Exception as e:
        logger.error(f"Erro ao testar conexão com o banco de dados: {e}")
        return {"status": "error", "message": str(e)}

app.include_router(auth.router, prefix='/api/auth')
app.include_router(categories.router, prefix='/api/categories')
app.include_router(transactions.router, prefix='/api/transactions')
app.include_router(goals.router, prefix='/api/goals')
app.include_router(ai.router, prefix='/api/ai')
app.include_router(bills.router, prefix='/api/bills')
app.include_router(cards.router, prefix='/api/cards')
app.include_router(investments.router, prefix='/api/investments')
app.include_router(gamification.router, prefix='/api/gamification')
app.include_router(reports.router, prefix='/api/reports')
app.include_router(control.router, prefix='/api/control')

frontend_dir = os.path.join(current_dir, 'frontend')
uploads_dir = os.path.join(current_dir, 'backend', 'uploads')
os.makedirs(uploads_dir, exist_ok=True)
app.mount('/api/uploads', StaticFiles(directory=uploads_dir), name='uploads')

@app.exception_handler(StarletteHTTPException)
async def spa_handler(request, exc):
    if exc.status_code == 404 and not request.url.path.startswith('/api'):
        f = os.path.join(frontend_dir, 'index.html')
        if os.path.exists(f):
            return FileResponse(f)
    return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

if os.path.exists(frontend_dir):
    app.mount('/', StaticFiles(directory=frontend_dir, html=True), name='frontend')

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
