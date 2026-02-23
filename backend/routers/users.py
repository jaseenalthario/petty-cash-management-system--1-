from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import database, models, schemas, auth

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[schemas.User])
def get_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    return db.query(models.User).all()

@router.post("", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="USER_CREATE", details=f"Created user {new_user.email} with role {new_user.role}")
    db.add(audit_log)
    db.commit()
    
    return new_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.check_role(["admin"]))):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="USER_DELETE", details=f"Deleted user ID {user_id}")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}

@router.patch("/me/password")
def update_password(request: schemas.PasswordUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not auth.verify_password(request.currentPassword, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password = auth.get_password_hash(request.newPassword)
    db.commit()
    
    # Log Action
    audit_log = models.AuditLog(user_id=current_user.id, action="PASSWORD_CHANGE", details="User changed their password")
    db.add(audit_log)
    db.commit()
    
    return {"success": True}
