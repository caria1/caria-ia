from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from backend import models, schemas, utils
import os
from backend.database import get_db

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = utils.jwt.decode(token, utils.SECRET_KEY, algorithms=[utils.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except utils.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = utils.get_password_hash(user.password)
    db_user = models.User(email=user.email, full_name=user.full_name, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Cria categorias padrão em português
    default_categories = [
        {"name": "Salário",           "type": "income"},
        {"name": "Renda Extra",       "type": "income"},
        {"name": "Negócios",          "type": "income"},
        {"name": "Alimentação",       "type": "expense"},
        {"name": "Moradia",           "type": "expense"},
        {"name": "Transporte",        "type": "expense"},
        {"name": "Saúde",             "type": "expense"},
        {"name": "Comunicação",       "type": "expense"},
        {"name": "Educação",          "type": "expense"},
        {"name": "Lazer",             "type": "expense"},
        {"name": "Pessoais",          "type": "expense"},
        {"name": "Serv. Financeiros", "type": "expense"},
        {"name": "Empresa",           "type": "expense"},
        {"name": "Dependentes",       "type": "expense"},
        {"name": "Diversos",          "type": "expense"},
    ]
    for cat in default_categories:
        new_cat = models.Category(name=cat["name"], type=cat["type"], owner_id=db_user.id)
        db.add(new_cat)
    db.commit()

    return db_user

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = utils.timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

class BalanceUpdate(BaseModel):
    balance: float

@router.put("/me/balance", response_model=schemas.UserOut)
def update_balance(update: BalanceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.balance = update.balance
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/profile-picture", response_model=schemas.UserOut)
def upload_profile_picture(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"user_{current_user.id}_profile{file_extension}"
    file_path = os.path.join(uploads_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    current_user.profile_picture = f"/api/uploads/{safe_filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put('/me/profile')
def update_profile(
    profile_data: dict,
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if 'financial_profile' in profile_data:
        current_user.financial_profile = profile_data['financial_profile']
    db.commit()
    return {'status': 'success'}

