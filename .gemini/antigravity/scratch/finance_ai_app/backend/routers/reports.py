from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user

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

@router.get("/net-worth-12m")
def get_net_worth_evolution(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # simplified representation
    txs = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).all()
    # build a monthly array backwards
    return {"evolution": []}
