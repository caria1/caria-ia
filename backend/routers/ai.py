from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend import models, schemas
from backend.database import get_db
from routers.auth import get_current_user
from ai_module.advisor import generate_insights, generate_business_ideas, forecast_balance

router = APIRouter()

@router.get("/insights")
def get_insights(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transactions = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all()
    categories = db.query(models.Category).filter(models.Category.owner_id == current_user.id).all()
    insights = generate_insights(transactions, categories)
    return {"insights": insights}

@router.get("/ideas")
def get_ideas(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transactions = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all()
    ideas = generate_business_ideas(transactions)
    return {"ideas": ideas}

@router.get("/forecast")
def get_forecast(months: int = 6, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Calculate balance
    # Use user.balance + transactions diff
    tx_total = sum(t.amount if t.type == "income" else -t.amount for t in db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all())
    current_balance = current_user.balance + tx_total
    
    # CDI approx 10.4% year -> 0.82% month compounded
    monthly_rate = 0.0082
    projected = current_balance * ((1 + monthly_rate) ** months)
    
    return {
        "current_balance": round(current_balance, 2),
        "projected_cdi_balance": round(projected, 2),
        "months": months
    }

@router.get("/comparison")
def get_comparison(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transactions = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all()
    # Group expenses by YYYY-MM
    from collections import defaultdict
    monthly_expenses = defaultdict(float)
    monthly_income = defaultdict(float)
    
    for t in transactions:
        month_key = t.date.strftime("%Y-%m")
        if t.type == "expense":
            monthly_expenses[month_key] += t.amount
        else:
            monthly_income[month_key] += t.amount
            
    # sort keys
    keys = sorted(list(set(monthly_expenses.keys()) | set(monthly_income.keys())))
    data = []
    for k in keys:
        data.append({
            "month": k,
            "expenses": monthly_expenses[k],
            "income": monthly_income[k]
        })
    return {"comparison": data}

@router.get("/health-score")
def get_health_score(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Advanced logic: compare income vs expenses, check if limits are respected, etc.
    txs = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all()
    # Mocking advanced AI math
    if not txs:
        return {"score": 50, "tips": ["Comece a registrar suas transações para analisarmos sua saúde financeira."]}
    
    total_income = sum(t.amount for t in txs if t.type == "income")
    total_expense = sum(t.amount for t in txs if t.type == "expense")
    
    score = 50
    tips = []
    if total_income > total_expense * 1.5:
        score = 95
        tips.append("Excelente! Você está gastando bem menos do que ganha. Considere investir o excedente.")
    elif total_income > total_expense:
        score = 75
        tips.append("Muito bom. Você está no azul. Tente reduzir gastos superférfluos para poupar mais.")
    else:
        score = 30
        tips.append("Cuidado! Suas despesas ultrapassaram suas receitas. Revise seus cartões de crédito e metas.")
    
    # Save score
    current_user.health_score = score
    db.commit()
    
    return {"score": score, "tips": tips}

@router.get("/predict")
def get_next_month_prediction(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    txs = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id, models.Transaction.type == "expense").all()
    # Simple linear average as "AI predict"
    if not txs:
        return {"prediction": 0}
        
    months_active = len(set(t.date.strftime("%Y-%m") for t in txs))
    total_spent = sum(t.amount for t in txs)
    
    return {"prediction": total_spent / (months_active or 1)}
