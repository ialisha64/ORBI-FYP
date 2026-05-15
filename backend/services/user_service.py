import secrets
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from core.db import get_db
from core.security import hash_password, verify_password
from models.user import UserCreate, UserUpdate, UserInDB


async def create_user(data: UserCreate) -> tuple[UserInDB, str]:
    """Returns (user, verification_token)."""
    db = get_db()

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    token = secrets.token_urlsafe(32)

    user_doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "is_verified": False,
        "email_verification_token": token,
        "profile_picture": None,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return UserInDB.from_mongo(user_doc), token


async def verify_email_token(token: str) -> Optional[UserInDB]:
    """Mark user as verified if token matches. Returns updated user or None."""
    db = get_db()
    doc = await db.users.find_one_and_update(
        {"email_verification_token": token, "is_verified": False},
        {"$set": {"is_verified": True, "email_verification_token": None, "updated_at": datetime.utcnow()}},
        return_document=True,
    )
    if doc:
        return UserInDB.from_mongo(doc)
    return None


async def get_user_by_email(email: str) -> Optional[UserInDB]:
    db = get_db()
    doc = await db.users.find_one({"email": email})
    if doc:
        return UserInDB.from_mongo(doc)
    return None


async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    db = get_db()
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    if doc:
        return UserInDB.from_mongo(doc)
    return None


async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def update_user(user_id: str, data: UserUpdate) -> Optional[UserInDB]:
    db = get_db()
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        return await get_user_by_id(user_id)

    update_fields["updated_at"] = datetime.utcnow()

    try:
        result = await db.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
            return_document=True,
        )
    except Exception:
        return None

    if result:
        return UserInDB.from_mongo(result)
    return None


async def delete_user(user_id: str) -> bool:
    db = get_db()
    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count == 1
    except Exception:
        return False


async def create_password_reset_token(email: str) -> Optional[tuple[UserInDB, str]]:
    """Generate a 1-hour password reset token for the given email.
    Returns (user, token) or None if email not found.
    """
    db = get_db()
    user = await get_user_by_email(email)
    if not user:
        return None  # Don't reveal whether the email exists

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    await db.users.update_one(
        {"email": email},
        {"$set": {
            "password_reset_token": token,
            "password_reset_expires": expires,
            "updated_at": datetime.utcnow(),
        }},
    )
    return user, token


async def reset_password_with_token(token: str, new_password: str) -> bool:
    """Reset the user's password if the token is valid and not expired."""
    db = get_db()
    now = datetime.utcnow()

    doc = await db.users.find_one_and_update(
        {
            "password_reset_token": token,
            "password_reset_expires": {"$gt": now},
        },
        {"$set": {
            "password_hash": hash_password(new_password),
            "password_reset_token": None,
            "password_reset_expires": None,
            "updated_at": now,
        }},
        return_document=True,
    )
    return doc is not None
