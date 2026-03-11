from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import models
from routers import auth, transactions, categories, goals, ai, bills, cards, investments, gamification, reports, control
from database import engine, Base

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance AI API")

# Setup CORS
origins = [
    "*", # Permite tudo por enquanto
    "http://localhost",
    "http://localhost:8000",
    "https://*.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"status": "ok"}

# Mount Vue/React/Vanilla Frontend
import os

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


