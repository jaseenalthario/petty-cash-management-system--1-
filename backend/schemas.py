from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    token: str
    user: User

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str

# Fund Schemas
class FundBase(BaseModel):
    fund_name: str
    total_amount: float

class FundCreate(FundBase):
    pass

class Fund(FundBase):
    id: int
    remaining_amount: float
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}

class TopupRequest(BaseModel):
    amount: float

# Expense Schemas
class ExpenseBase(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    fund_id: int

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    user_id: int
    receipt_url: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    created_at: datetime
    employee_name: Optional[str] = None
    fund_name: Optional[str] = None

    model_config = {"from_attributes": True}

class StatusUpdateRequest(BaseModel):
    status: str

# Stats Schemas
class CategoryStat(BaseModel):
    category: str
    total: float

class Stats(BaseModel):
    totalApprovedExpenses: float
    pendingRequests: int
    availableLiquidity: float
    categoryStats: List[CategoryStat]

# Audit Log Schemas
class AuditLog(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: str
    created_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = {"from_attributes": True}
