from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    profile_picture: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    is_verified: bool = False
    profile_picture: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    is_verified: bool = False
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    profile_picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    @classmethod
    def from_mongo(cls, data: dict) -> "UserInDB":
        if data and "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_response(self) -> UserResponse:
        return UserResponse(
            id=self.id,
            name=self.name,
            email=self.email,
            is_verified=self.is_verified,
            profile_picture=self.profile_picture,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
