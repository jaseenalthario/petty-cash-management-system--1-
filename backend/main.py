from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend import models, auth
from backend.database import engine, SessionLocal
from backend.routers import auth as auth_router, users, funds, expenses, stats
import os
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Seed Admin User
        admin = db.query(models.User).filter(models.User.email == "admin@company.com").first()
        if not admin:
            hashed_password = auth.get_password_hash("admin123")
            db_admin = models.User(name="System Admin", email="admin@company.com", password=hashed_password, role="admin")
            db.add(db_admin)
            
            # Seed Accountant
            acc_hashed = auth.get_password_hash("acc123")
            db_acc = models.User(name="John Accountant", email="accountant@company.com", password=acc_hashed, role="accountant")
            db.add(db_acc)
            
            # Seed Employee
            emp_hashed = auth.get_password_hash("emp123")
            db_emp = models.User(name="Jane Employee", email="employee@company.com", password=emp_hashed, role="employee")
            db.add(db_emp)
            
            db.commit()
    finally:
        db.close()
    yield

app = FastAPI(title="Petty Cash Management System API", lifespan=lifespan)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(funds.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(stats.router) # stats router already has /api prefix in its decorators

@app.get("/")
def root():
    return {"message": "Petty Cash Management System API is running"}


