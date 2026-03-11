from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.CategoryOut)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_category = models.Category(**category.model_dump(), owner_id=current_user.id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[schemas.CategoryOut])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    categories = db.query(models.Category).filter(models.Category.owner_id == current_user.id).offset(skip).limit(limit).all()
    return categories

from pydantic import BaseModel
class BudgetUpdate(BaseModel):
    budget_limit: float

@router.put("/{category_id}/budget", response_model=schemas.CategoryOut)
def update_category_budget(category_id: int, budget: BudgetUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    category = db.query(models.Category).filter(models.Category.id == category_id, models.Category.owner_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.budget_limit = budget.budget_limit
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    category = db.query(models.Category).filter(models.Category.id == category_id, models.Category.owner_id == current_user.id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"status": "success"}
