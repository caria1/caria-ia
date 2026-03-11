from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=schemas.CreditCardOut)
def create_card(card: schemas.CreditCardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_card = models.CreditCard(**card.model_dump(), owner_id=current_user.id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@router.get("/", response_model=List[schemas.CreditCardOut])
def read_cards(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.CreditCard).filter(models.CreditCard.owner_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/{card_id}/invoice")
def get_card_invoice(card_id: int, month: int = None, year: int = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id, models.CreditCard.owner_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
        
    now = datetime.now()
    month = month or now.month
    year = year or now.year
    
    # Calculate invoice cycle (simplified for now: all transactions grouped by month)
    txs = db.query(models.Transaction).filter(
        models.Transaction.card_id == card_id,
        models.Transaction.owner_id == current_user.id
    ).all()
    
    total = sum(t.amount for t in txs if t.date.month == month and t.date.year == year)
    
    return {
        "card_id": card.id,
        "name": card.name,
        "limit": card.limit,
        "invoice_total": total,
        "available_limit": max(0, card.limit - total),
        "month": month,
        "year": year
    }

@router.delete("/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id, models.CreditCard.owner_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"status": "success"}
