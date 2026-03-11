from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/achievements", response_model=schemas.AchievementOut)
def create_achievement(ach: schemas.AchievementOut, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_ach = models.Achievement(**ach.model_dump(exclude={'id'}), owner_id=current_user.id)
    db.add(db_ach)
    db.commit()
    db.refresh(db_ach)
    return db_ach

@router.get("/achievements", response_model=List[schemas.AchievementOut])
def read_achievements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Achievement).filter(models.Achievement.owner_id == current_user.id).all()

@router.get("/alerts", response_model=List[schemas.AlertOut])
def read_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Alert).filter(models.Alert.owner_id == current_user.id).order_by(models.Alert.created_at.desc()).all()

@router.put("/alerts/{alert_id}/read")
def read_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.owner_id == current_user.id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"status": "success"}
