from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from backend import database, models, schemas, auth
import os
import shutil
from datetime import datetime

router = APIRouter(prefix="/expenses", tags=["expenses"])

UPLOAD_DIR = "uploads"

@router.get("", response_model=List[schemas.Expense])
def get_expenses(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Expense, models.User.name.label("employee_name"), models.Fund.fund_name.label("fund_name")) \
        .join(models.User, models.Expense.user_id == models.User.id) \
        .join(models.Fund, models.Expense.fund_id == models.Fund.id)
    
    if current_user.role == "employee":
        query = query.filter(models.Expense.user_id == current_user.id)
    
    results = query.order_by(models.Expense.created_at.desc()).all()
    
    expenses = []
    for expense, employee_name, fund_name in results:
        expense_dict = expense.__dict__
        expense_dict["employee_name"] = employee_name
        expense_dict["fund_name"] = fund_name
        expenses.append(expense_dict)
        
    return expenses

@router.post("", response_model=schemas.Expense)
async def create_expense(
    fund_id: int = Form(...),
    amount: float = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    receipt: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    receipt_url = None
    if receipt:
        filename = f"{int(datetime.now().timestamp())}-{receipt.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(receipt.file, buffer)
        receipt_url = f"/uploads/{filename}"
    
    new_expense = models.Expense(
        user_id=current_user.id,
        fund_id=fund_id,
        amount=amount,
        category=category,
        description=description,
        receipt_url=receipt_url
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="EXPENSE_SUBMIT", details=f"Submitted expense of AED {amount} for {category}")
    db.add(audit_log)
    db.commit()
    
    return new_expense

@router.patch("/{expense_id}")
async def update_expense(
    expense_id: int,
    amount: float = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    receipt: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if expense.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending expenses can be edited")

    expense.amount = amount
    expense.category = category
    expense.description = description

    if receipt:
        filename = f"{int(datetime.now().timestamp())}-{receipt.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(receipt.file, buffer)
        expense.receipt_url = f"/uploads/{filename}"

    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="EXPENSE_EDIT", details=f"Edited expense ID {expense_id}")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if expense.status != "pending" and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Only pending expenses can be deleted")

    db.delete(expense)
    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="EXPENSE_DELETE", details=f"Deleted expense ID {expense_id}")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}

@router.patch("/{expense_id}/status")
def update_expense_status(
    expense_id: int,
    request: schemas.StatusUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_role(["admin", "accountant"]))
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.status != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    if request.status == "approved":
        fund = db.query(models.Fund).filter(models.Fund.id == expense.fund_id).first()
        if fund.remaining_amount < expense.amount:
            raise HTTPException(status_code=400, detail="Insufficient fund balance")
        
        fund.remaining_amount -= expense.amount
        expense.status = "approved"
        expense.approved_by = current_user.id
        
        # Log Action
        audit_log = models.AuditLog(user_id=current_user.id, action="EXPENSE_APPROVE", details=f"Approved expense ID {expense_id} of AED {expense.amount}")
    else:
        expense.status = "rejected"
        expense.approved_by = current_user.id
        # Log Action
        audit_log = models.AuditLog(user_id=current_user.id, action="EXPENSE_REJECT", details=f"Rejected expense ID {expense_id}")

    db.add(audit_log)
    db.commit()
    return {"success": True}
