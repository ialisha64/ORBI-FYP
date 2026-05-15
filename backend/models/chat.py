from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    tone: Optional[str] = "Friendly"


class ChatMessageResponse(BaseModel):
    id: str
    user_id: str
    session_id: str
    role: MessageRole
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatReply(BaseModel):
    reply: str
    session_id: str
    message_id: str


class ChatMessageInDB(BaseModel):
    id: Optional[str] = None
    user_id: str
    session_id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def from_mongo(cls, data: dict) -> "ChatMessageInDB":
        if data and "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_response(self) -> ChatMessageResponse:
        return ChatMessageResponse(
            id=self.id,
            user_id=self.user_id,
            session_id=self.session_id,
            role=self.role,
            content=self.content,
            timestamp=self.timestamp,
        )


class ChatSessionSummary(BaseModel):
    session_id: str
    message_count: int
    last_message: str
    last_timestamp: datetime
