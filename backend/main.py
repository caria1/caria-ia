from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Caria IA API")

# EARLY HEALTH CHECK - Reage rápido para o Railway não matar o app
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Setup CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Late imports to ensure health check is registered ASAP
try:
    import backend.models as models
    from backend.database import engine, Base
    from backend.routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
    
    @app.on_event("startup")
    async def startup_event():
        try:
            logger.info("Initializing database tables...")
            models.Base.metadata.create_all(bind=engine)
            logger.info("Database tables initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database tables: {e}")

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

    # Mount Static Files
    base_dir = os.path.dirname(__file__)
    uploads_dir = os.path.join(base_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    frontend_dir = os.path.join(base_dir, "..", "frontend")
    if os.path.exists(frontend_dir):
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    else:
        logger.warning(f"Frontend directory not found at {frontend_dir}")

except Exception as e:
    logger.error(f"CRITICAL ERROR DURING INITIALIZATION: {e}")


