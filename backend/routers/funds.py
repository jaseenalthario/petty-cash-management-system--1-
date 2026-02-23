from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import database, models, schemas, auth

router = APIRouter(prefix="/funds", tags=["funds"])

@router.get("", response_model=List[schemas.Fund])
def get_funds(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Fund).all()

@router.post("", response_model=schemas.Fund)
def create_fund(fund: schemas.FundCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    new_fund = models.Fund(
        fund_name=fund.fund_name,
        total_amount=fund.total_amount,
        remaining_amount=fund.total_amount,
        created_by=current_user.id
    )
    db.add(new_fund)
    db.commit()
    db.refresh(new_fund)
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="FUND_CREATE", details=f"Created fund {new_fund.fund_name} with AED {new_fund.total_amount}")
    db.add(audit_log)
    db.commit()
    
    return new_fund

@router.patch("/{fund_id}/topup")
def topup_fund(fund_id: int, request: schemas.TopupRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    fund = db.query(models.Fund).filter(models.Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    fund.total_amount += request.amount
    fund.remaining_amount += request.amount
    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="FUND_TOPUP", details=f"Topped up fund ID {fund_id} with AED {request.amount}")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}

@router.delete("/{fund_id}")
def delete_fund(fund_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    fund = db.query(models.Fund).filter(models.Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Optional: Check if there are associated expenses (though existing server.js just deletes)
    # db.query(models.Expense).filter(models.Expense.fund_id == fund_id).delete()
    
    db.delete(fund)
    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="FUND_DELETE", details=f"Deleted fund ID {fund_id}")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}
