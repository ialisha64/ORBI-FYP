from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from models.user import UserCreate, UserResponse, UserInDB
from models.auth import TokenResponse, RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest
from services.user_service import (
    create_user, authenticate_user, get_user_by_id, verify_email_token,
    create_password_reset_token, reset_password_with_token,
)
from services.email_service import send_verification_email, send_password_reset_email
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    user, token = await create_user(data)
    try:
        await send_verification_email(user.email, user.name, token)
    except Exception as e:
        print(f"[Register] Email send error: {e}")
    return {
        "message": f"Account created! A verification link has been sent to {user.email}. Please verify your email before logging in.",
        "email": user.email,
    }


@router.get("/verify-email/{token}", status_code=status.HTTP_200_OK)
async def verify_email(token: str):
    user = await verify_email_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )
    return {"message": "Email verified successfully! You can now log in.", "email": user.email}


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Email verification disabled for development
    # if not user.is_verified:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Please verify your email before logging in. Check your inbox.",
    #     )
    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user.to_response(),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token({"sub": user.id, "email": user.email})
    new_refresh_token = create_refresh_token({"sub": user.id})
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user.to_response(),
    )


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(data: ForgotPasswordRequest):
    result = await create_password_reset_token(data.email)
    if result:
        user, token = result
        try:
            await send_password_reset_email(user.email, user.name, token)
        except Exception as e:
            print(f"[ForgotPassword] Email send error: {e}")
    # Always return the same message to prevent email enumeration
    return {"message": "If this email is registered, a password reset link has been sent. Check your inbox."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: ResetPasswordRequest):
    success = await reset_password_with_token(data.token, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )
    return {"message": "Password reset successfully! You can now log in with your new password."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user.to_response()
