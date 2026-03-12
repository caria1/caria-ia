import logging
import os
import sys
import time
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
# from slowapi import _rate_limit_exceeded_handler
# from slowapi.errors import RateLimitExceeded
# from backend.security import limiter

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Caminho Base
current_dir = os.path.dirname(os.path.abspath(__file__))

# Inicialização do FastAPI
app = FastAPI()

# Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importando os roteadores
from backend.routers import ai, auth

# Incluindo os roteadores
app.include_router(ai.router, prefix="/api/ai")
app.include_router(auth.router, prefix="/api/auth")

@app.get("/")
async def root():
    return {"message": "API funcionando corretamente!"}

# Certifique-se de que não há bloco if __name__ == "__main__" para exportar app globalmente.
