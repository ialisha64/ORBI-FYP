from fastapi import APIRouter
from pydantic import BaseModel
import openai
import os

chat_router = APIRouter()

openai.api_key = os.getenv("OPENAI_API_KEY")

class UserMessage(BaseModel):
    message: str

@chat_router.post("/chat")
def chat_with_orbi(data: UserMessage):
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are Orbi, a friendly virtual robot assistant."},
            {"role": "user", "content": data.message}
        ]
    )

    reply = response.choices[0].message.content
    return {"reply": reply}
