from fastapi import APIRouter, Depends, HTTPException, status

from models.chat import ChatMessageCreate, ChatReply, ChatMessageResponse, ChatSessionSummary
from models.user import UserInDB
from services.chat_service import (
    chat_with_orbi,
    get_session_history,
    get_user_sessions,
    delete_session,
)
from core.security import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatReply)
async def send_message(
    data: ChatMessageCreate,
    current_user: UserInDB = Depends(get_current_user),
):
    return await chat_with_orbi(current_user.id, current_user.name, data)


@router.get("/sessions", response_model=list[ChatSessionSummary])
async def list_sessions(current_user: UserInDB = Depends(get_current_user)):
    return await get_user_sessions(current_user.id)


@router.get("/sessions/{session_id}", response_model=list[ChatMessageResponse])
async def get_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    messages = await get_session_history(current_user.id, session_id, limit=100)
    return [m.to_response() for m in messages]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    success = await delete_session(current_user.id, session_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
