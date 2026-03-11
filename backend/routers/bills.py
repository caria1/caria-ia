from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.BillOut)
def create_bill(bill: schemas.BillCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_bill = models.Bill(**bill.model_dump(), owner_id=current_user.id)
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

@router.get("/", response_model=List[schemas.BillOut])
def read_bills(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bills = db.query(models.Bill).filter(models.Bill.owner_id == current_user.id).order_by(models.Bill.due_date.asc()).offset(skip).limit(limit).all()
    return bills

@router.put("/{bill_id}/status", response_model=schemas.BillOut)
def update_bill_status(bill_id: int, status: schemas.BillUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id, models.Bill.owner_id == current_user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.is_paid = status.is_paid
    db.commit()
    db.refresh(bill)
    return bill

@router.delete("/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id, models.Bill.owner_id == current_user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return {"status": "success"}
