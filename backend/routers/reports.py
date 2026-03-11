from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import models, schemas
from backend.database import get_db
from backend.routers.auth import get_current_user

router = APIRouter()

@router.get("/ir")
def get_ir_report(year: int = 2023, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Calculate IR for investments, incomes, expenses
    # 1. Gather all transactions in the year
    txs = db.query(models.Transaction).filter(
        models.Transaction.owner_id == current_user.id
    ).all()
    
    # Very simplified IR logic
    total_income = sum(t.amount for t in txs if t.type == 'income' and t.date.year == year)
    total_health_edu = sum(t.amount for t in txs if t.type == 'expense' and t.date.year == year and t.category and t.category.name in ['Saúde', 'Educação'])
    
    # 2. Gather investments
    invs = db.query(models.Investment).filter(models.Investment.owner_id == current_user.id).all()
    
    return {
        "year": year,
        "total_taxable_income": total_income,
        "deductible_expenses": total_health_edu,
        "invested_capital": sum(i.quantity * i.average_price for i in invs),
    }

@router.get("/net-worth-evolution")
def get_net_worth_evolution(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from datetime import datetime, timedelta
    from collections import defaultdict
    
    txs = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).order_by(models.Transaction.date).all()
    
    if not txs:
        return {"evolution": []}
        
    # Agrupar por mês
    monthly_balance = defaultdict(float)
    for t in txs:
        month_key = t.date.strftime("%Y-%m")
        amount = t.amount if t.type == 'income' else -t.amount
        monthly_balance[month_key] += amount
        
    # Calcular saldo acumulado
    evolution = []
    running_total = current_user.balance
    
    # Pegar os últimos 12 meses
    today = datetime.now()
    months = []
    for i in range(12):
        d = today - timedelta(days=i*30)
        months.append(d.strftime("%Y-%m"))
    months.reverse()
    
    for m in months:
        running_total += monthly_balance.get(m, 0)
        evolution.append({
            "month": m,
            "balance": round(running_total, 2)
        })
        
    return {"evolution": evolution}

@router.get("/category-distribution")
def get_category_distribution(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from collections import defaultdict
    txs = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id, models.Transaction.type == 'expense').all()
    
    distribution = defaultdict(float)
    total = 0
    for t in txs:
        cat_name = t.category.name if t.category else "Outros"
        distribution[cat_name] += t.amount
        total += t.amount
        
    if total == 0:
        return {"distribution": []}
        
    result = [{"category": k, "amount": v, "percentage": round((v/total)*100, 1)} for k, v in distribution.items()]
    # Sort by amount
    result.sort(key=lambda x: x["amount"], reverse=True)
    return {"distribution": result}
