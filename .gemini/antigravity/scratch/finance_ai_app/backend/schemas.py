from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# USER
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    balance: float = 0.0
    profile_picture: Optional[str] = None
    health_score: Optional[int] = 50
    financial_profile: Optional[str] = None
    family_group_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True

# TOKEN
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# CATEGORY
class CategoryBase(BaseModel):
    name: str
    type: str
    budget_limit: Optional[float] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# TRANSACTION
class TransactionBase(BaseModel):
    amount: float
    type: str # income or expense
    description: str
    date: datetime
    category_id: int
    card_id: Optional[int] = None
    is_recurring: bool = False
    split_with: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionOut(TransactionBase):
    id: int
    owner_id: int
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True

# GOAL
class GoalBase(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0.0
    deadline: datetime

class GoalCreate(GoalBase):
    pass

class GoalOut(GoalBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# BILL
class BillBase(BaseModel):
    title: str
    amount: float
    due_date: datetime
    is_paid: bool = False

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    is_paid: bool

class BillOut(BillBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# CREDIT CARDS
class CreditCardBase(BaseModel):
    name: str
    limit: float
    closing_day: int
    due_day: int

class CreditCardCreate(CreditCardBase):
    pass

class CreditCardOut(CreditCardBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# INVESTMENTS
class InvestmentBase(BaseModel):
    ticker: str
    type: str
    quantity: float
    average_price: float

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentOut(InvestmentBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# ACHIEVEMENTS & ALERTS
class AchievementOut(BaseModel):
    id: int
    title: str
    description: str
    icon: str
    owner_id: int

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    message: str
    type: str
    is_read: bool
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True
