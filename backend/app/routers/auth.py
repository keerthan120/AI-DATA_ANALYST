import secrets
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from app.db.session import get_db, Base, engine
from app.db.models import User

# Ensure tables are created in PostgreSQL
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Accounts"])

# Pydantic Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: datetime

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    token: Optional[str] = None

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password with bcrypt
    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(
        email=req.email.lower(),
        hashed_password=hashed,
        full_name=req.full_name or req.email.split("@")[0]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Simple session token
    token = secrets.token_urlsafe(32)

    return AuthResponse(
        success=True,
        message="Account created successfully.",
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            created_at=new_user.created_at
        ),
        token=token
    )

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Verify bcrypt hash
    valid_password = bcrypt.checkpw(
        req.password.encode("utf-8"),
        user.hashed_password.encode("utf-8")
    )
    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = secrets.token_urlsafe(32)

    return AuthResponse(
        success=True,
        message="Login successful.",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            created_at=user.created_at
        ),
        token=token
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        # Return generic message to avoid email enumeration
        return {
            "success": True,
            "message": "If an account exists with this email, a reset token has been issued."
        }

    # Generate 6-character reset token
    token = secrets.token_hex(3).upper() # e.g. 'A4F92B'
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    return {
        "success": True,
        "message": f"Password reset token issued for {user.email}.",
        "reset_token": token
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token request."
        )

    if user.reset_token != req.reset_token.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect reset token."
        )

    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )

    # Hash new password
    hashed = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.hashed_password = hashed
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {
        "success": True,
        "message": "Password updated successfully. You may now log in with your new credentials."
    }

