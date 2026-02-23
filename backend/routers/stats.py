from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from backend import database, models, schemas, auth

router = APIRouter(tags=["stats"])

@router.get("/api/stats", response_model=schemas.Stats)
def get_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    total_approved = db.query(func.sum(models.Expense.amount)).filter(models.Expense.status == "approved").scalar() or 0
    pending_count = db.query(models.Expense).filter(models.Expense.status == "pending").count()
    available_liquidity = db.query(func.sum(models.Fund.remaining_amount)).scalar() or 0
    
    category_raw = db.query(models.Expense.category, func.sum(models.Expense.amount)) \
        .filter(models.Expense.status == "approved") \
        .group_by(models.Expense.category).all()
        
    category_stats = [{"category": cat, "total": total} for cat, total in category_raw]
    
    return {
        "totalApprovedExpenses": total_approved,
        "pendingRequests": pending_count,
        "availableLiquidity": available_liquidity,
        "categoryStats": category_stats
    }

@router.get("/api/audit-logs", response_model=List[schemas.AuditLog])
def get_audit_logs(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    logs = db.query(models.AuditLog, models.User.name.label("user_name"), models.User.email.label("user_email")) \
        .outerjoin(models.User, models.AuditLog.user_id == models.User.id) \
        .order_by(models.AuditLog.created_at.desc()).limit(100).all()
        
    result = []
    for log, name, email in logs:
        log_dict = log.__dict__
        log_dict["user_name"] = name
        log_dict["user_email"] = email
        result.append(log_dict)
        
    return result
