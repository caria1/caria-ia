from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    balance = Column(Float, default=0.0)
    profile_picture = Column(String, nullable=True)
    health_score = Column(Integer, default=50)
    financial_profile = Column(String, nullable=True) # json dump of {income, goal, etc}
    family_group_id = Column(String, nullable=True)
    
    transactions = relationship("Transaction", back_populates="owner")
    categories = relationship("Category", back_populates="owner")
    goals = relationship("Goal", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # income or expense
    budget_limit = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    type = Column(String) # income or expense
    description = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    category_id = Column(Integer, ForeignKey("categories.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=True)
    is_recurring = Column(Boolean, default=False)
    split_with = Column(String, nullable=True) # JSON or simple string
    
    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    card = relationship("CreditCard", back_populates="transactions")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    target_amount = Column(Float)
    current_amount = Column(Float, default=0.0)
    deadline = Column(DateTime)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="goals")

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    amount = Column(Float)
    due_date = Column(DateTime)
    is_paid = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User")

class CreditCard(Base):
    __tablename__ = "credit_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    limit = Column(Float)
    closing_day = Column(Integer)
    due_day = Column(Integer)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User")
    transactions = relationship("Transaction", back_populates="card")

class Investment(Base):
    __tablename__ = "investments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True) # e.g., PETR4
    type = Column(String) # stock, fii, fixed
    quantity = Column(Float)
    average_price = Column(Float)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User")

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    icon = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    type = Column(String) # danger, warning, success
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User")
