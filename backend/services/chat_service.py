import uuid
from datetime import datetime
from typing import Optional
from openai import AsyncOpenAI

from core.db import get_db
from core.config import settings
from models.chat import ChatMessageCreate, ChatMessageInDB, MessageRole, ChatReply

_openai_client: Optional[AsyncOpenAI] = None

TONE_PROMPTS = {
    "Friendly": (
        "You are Orbi, a warm and friendly AI-powered virtual assistant. "
        "Be helpful, approachable, and kind. Use casual but respectful language. "
        "When appropriate, reference the user's name to feel personal. "
        "Keep responses clear and under 3 paragraphs unless the user asks for detail."
    ),
    "Professional": (
        "You are Orbi, a professional AI-powered virtual assistant. "
        "Be concise, formal, and precise. Use business-appropriate language. "
        "Avoid casual expressions. Reference the user's name respectfully when suitable. "
        "Keep responses clear and under 3 paragraphs unless the user asks for detail."
    ),
    "Casual": (
        "You are Orbi, a relaxed and casual AI-powered virtual assistant. "
        "Be laid-back and conversational, like talking to a friend. Use informal language, "
        "contractions, and a chill tone. Reference the user's name naturally. "
        "Keep responses concise unless the user wants more."
    ),
    "Enthusiastic": (
        "You are Orbi, an enthusiastic and energetic AI-powered virtual assistant! "
        "Be excited, motivating, and super positive! Use upbeat language and exclamation points. "
        "Encourage the user and make them feel great! Reference their name with energy! "
        "Keep responses lively and concise unless they ask for more detail!"
    ),
}

# Default fallback
ORBI_SYSTEM_PROMPT = TONE_PROMPTS["Friendly"]


def get_system_prompt(tone: str) -> str:
    return TONE_PROMPTS.get(tone, ORBI_SYSTEM_PROMPT)


def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url="https://api.groq.com/openai/v1")
    return _openai_client


async def save_message(
    user_id: str,
    session_id: str,
    role: MessageRole,
    content: str,
) -> ChatMessageInDB:
    db = get_db()
    doc = {
        "user_id": user_id,
        "session_id": session_id,
        "role": role.value,
        "content": content,
        "timestamp": datetime.utcnow(),
    }
    result = await db.chat_messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ChatMessageInDB.from_mongo(doc)


async def get_session_history(user_id: str, session_id: str, limit: int = 20) -> list[ChatMessageInDB]:
    db = get_db()
    cursor = (
        db.chat_messages.find({"user_id": user_id, "session_id": session_id})
        .sort("timestamp", 1)
        .limit(limit)
    )
    messages = []
    async for doc in cursor:
        messages.append(ChatMessageInDB.from_mongo(doc))
    return messages


async def get_user_sessions(user_id: str) -> list[dict]:
    db = get_db()
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"timestamp": -1}},
        {
            "$group": {
                "_id": "$session_id",
                "last_message": {"$first": "$content"},
                "last_timestamp": {"$first": "$timestamp"},
                "message_count": {"$sum": 1},
            }
        },
        {"$sort": {"last_timestamp": -1}},
        {"$limit": 20},
    ]
    sessions = []
    async for doc in db.chat_messages.aggregate(pipeline):
        sessions.append({
            "session_id": doc["_id"],
            "message_count": doc["message_count"],
            "last_message": doc["last_message"][:80] + "..." if len(doc["last_message"]) > 80 else doc["last_message"],
            "last_timestamp": doc["last_timestamp"],
        })
    return sessions


async def chat_with_orbi(
    user_id: str,
    user_name: str,
    data: ChatMessageCreate,
) -> ChatReply:
    session_id = data.session_id or str(uuid.uuid4())

    # Save user message
    await save_message(user_id, session_id, MessageRole.user, data.message)

    # Build conversation history for context
    history = await get_session_history(user_id, session_id, limit=10)
    system_prompt = get_system_prompt(data.tone or "Friendly")
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[:-1]:  # exclude the message we just saved (already last)
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": data.message})

    client = get_openai_client()
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        reply_text = response.choices[0].message.content
    except Exception as e:
        reply_text = f"I'm having trouble connecting right now. Please try again in a moment! (Error: {str(e)[:50]})"

    # Save assistant reply
    saved_reply = await save_message(user_id, session_id, MessageRole.assistant, reply_text)

    return ChatReply(
        reply=reply_text,
        session_id=session_id,
        message_id=saved_reply.id,
    )


async def delete_session(user_id: str, session_id: str) -> bool:
    db = get_db()
    result = await db.chat_messages.delete_many({"user_id": user_id, "session_id": session_id})
    return result.deleted_count > 0
