from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import models, schemas
from backend.database import get_db
from backend.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.InvestmentOut)
def create_investment(inv: schemas.InvestmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_inv = models.Investment(**inv.model_dump(), owner_id=current_user.id)
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.get("/", response_model=List[schemas.InvestmentOut])
def read_investments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Investment).filter(models.Investment.owner_id == current_user.id).all()

@router.delete("/{inv_id}")
def delete_investment(inv_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    inv = db.query(models.Investment).filter(models.Investment.id == inv_id, models.Investment.owner_id == current_user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(inv)
    db.commit()
    return {"status": "success"}
