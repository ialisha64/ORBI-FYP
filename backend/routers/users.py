from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from models.user import UserResponse, UserUpdate, UserInDB
from services.user_service import update_user, delete_user, get_user_by_id
from core.security import get_current_user, verify_password, hash_password
from core.db import get_db
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: UserInDB = Depends(get_current_user)):
    return current_user.to_response()


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    updated = await update_user(current_user.id, data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated.to_response()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: UserInDB = Depends(get_current_user)):
    success = await delete_user(current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    data: PasswordChangeRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters",
        )
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": datetime.utcnow()}},
    )
    return {"message": "Password updated successfully"}
