import re
import secrets
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from app.db.session import get_db, Base, engine
from app.db.models import User, ensure_db_schema

# Ensure tables and columns exist in PostgreSQL
ensure_db_schema()

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Accounts"])

# Password policy validator
def validate_strong_password(password: str) -> tuple[bool, Optional[str]]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit (0-9)."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)."
    return True, None

# Pydantic Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Verify2FARequest(BaseModel):
    email: EmailStr
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    is_2fa_enabled: Optional[bool] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    is_2fa_enabled: bool = False
    created_at: datetime

class AuthResponse(BaseModel):
    success: bool
    message: str
    requires_2fa: bool = False
    user: Optional[UserResponse] = None
    token: Optional[str] = None

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    is_strong, err_msg = validate_strong_password(req.password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(
        email=req.email.lower(),
        hashed_password=hashed,
        full_name=req.full_name or req.email.split("@")[0],
        phone_number=req.phone_number,
        company="Digital Back Office",
        role="Lead Data Analyst",
        is_2fa_enabled=1 if req.phone_number else 0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = secrets.token_urlsafe(32)

    return AuthResponse(
        success=True,
        message="Account created successfully with 2-Step Verification support.",
        requires_2fa=False,
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            phone_number=new_user.phone_number,
            company=new_user.company,
            role=new_user.role,
            is_2fa_enabled=bool(new_user.is_2fa_enabled),
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

    valid_password = bcrypt.checkpw(
        req.password.encode("utf-8"),
        user.hashed_password.encode("utf-8")
    )
    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2-Step Verification Check
    if user.is_2fa_enabled:
        otp = f"{secrets.randbelow(900000) + 100000}"
        user.two_factor_code = otp
        user.two_factor_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        return AuthResponse(
            success=True,
            message=f"2-Step Verification required. A 6-digit security code ({otp}) has been dispatched to {user.phone_number or user.email}.",
            requires_2fa=True,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                phone_number=user.phone_number,
                company=user.company,
                role=user.role,
                is_2fa_enabled=True,
                created_at=user.created_at
            ),
            token=None
        )

    token = secrets.token_urlsafe(32)

    return AuthResponse(
        success=True,
        message="Login successful.",
        requires_2fa=False,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            company=user.company,
            role=user.role,
            is_2fa_enabled=bool(user.is_2fa_enabled),
            created_at=user.created_at
        ),
        token=token
    )

@router.post("/verify-2fa", response_model=AuthResponse)
def verify_2fa(req: Verify2FARequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.two_factor_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending 2-Step Verification request found."
        )

    if user.two_factor_expires and user.two_factor_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please sign in again."
        )

    if user.two_factor_code.strip() != req.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code."
        )

    user.two_factor_code = None
    user.two_factor_expires = None
    db.commit()

    token = secrets.token_urlsafe(32)

    return AuthResponse(
        success=True,
        message="2-Step Verification passed successfully.",
        requires_2fa=False,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            company=user.company,
            role=user.role,
            is_2fa_enabled=bool(user.is_2fa_enabled),
            created_at=user.created_at
        ),
        token=token
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        return {
            "success": True,
            "message": "If an account exists with this email, a verification code has been dispatched."
        }

    # Generate 6-digit numeric reset verification code
    token = f"{secrets.randbelow(900000) + 100000}"
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    return {
        "success": True,
        "message": f"A verification code has been sent to {user.email}.",
        "reset_token": token
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    is_strong, err_msg = validate_strong_password(req.new_password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset verification code request."
        )

    if user.reset_token.strip().upper() != req.reset_token.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code."
        )

    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    hashed = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.hashed_password = hashed
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {
        "success": True,
        "message": "Password updated successfully with strong security verification."
    }

@router.put("/profile", response_model=AuthResponse)
def update_profile(req: UpdateProfileRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    if req.full_name is not None:
        user.full_name = req.full_name
    if req.phone_number is not None:
        user.phone_number = req.phone_number
    if req.company is not None:
        user.company = req.company
    if req.role is not None:
        user.role = req.role
    if req.is_2fa_enabled is not None:
        user.is_2fa_enabled = 1 if req.is_2fa_enabled else 0

    # Password change check
    if req.new_password:
        if not req.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change your password."
            )
        valid_password = bcrypt.checkpw(
            req.current_password.encode("utf-8"),
            user.hashed_password.encode("utf-8")
        )
        if not valid_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed."
            )
        is_strong, err_msg = validate_strong_password(req.new_password)
        if not is_strong:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )
        user.hashed_password = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.commit()
    db.refresh(user)

    return AuthResponse(
        success=True,
        message="Profile details and security settings updated successfully.",
        requires_2fa=False,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            company=user.company,
            role=user.role,
            is_2fa_enabled=bool(user.is_2fa_enabled),
            created_at=user.created_at
        )
    )
