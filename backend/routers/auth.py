from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend import database, models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login(request: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not auth.verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = auth.create_access_token(data={"email": user.email, "role": user.role, "id": user.id, "name": user.name})
    
    # Log Action
    audit_log = models.AuditLog(user_id=user.id, action="LOGIN", details=f"User {user.email} logged in")
    db.add(audit_log)
    db.commit()
    
    return {"token": token, "user": user}

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
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
    audit_log = models.AuditLog(user_id=new_user.id, action="USER_REGISTER", details=f"New user {new_user.email} registered as {new_user.role}")
    db.add(audit_log)
    db.commit()
    
    return new_user
