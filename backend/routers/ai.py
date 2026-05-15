"""
AI-powered endpoints: summarize tasks, smart task creation,
email drafting, daily briefing, ask anything, rewrite text.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from core.security import get_current_user
from models.user import UserInDB
from models.task import TaskCreate, TaskResponse, TaskPriority
from services import ai_service, task_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


# ── Request / Response Models ────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    context: Optional[str] = None


class AskResponse(BaseModel):
    answer: str


class SmartTaskRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000,
                      description="Natural language task description, e.g. 'Remind me to call dentist tomorrow'")


class SmartTaskResponse(BaseModel):
    task: TaskResponse
    ai_interpretation: str


class EmailDraftRequest(BaseModel):
    recipient: str = Field(..., min_length=1, max_length=200)
    purpose: str = Field(..., min_length=1, max_length=1000)
    tone: str = Field(default="professional", max_length=50)
    extra_details: Optional[str] = Field(None, max_length=2000)


class EmailDraftResponse(BaseModel):
    draft: str


class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    style: str = Field(default="professional", max_length=50)


class RewriteResponse(BaseModel):
    rewritten: str


class SummaryResponse(BaseModel):
    summary: str


class BriefingResponse(BaseModel):
    briefing: str


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse)
async def ask_anything(
    data: AskRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    """Ask Orbi any question — general-purpose AI Q&A."""
    answer = await ai_service.ask_orbi(data.question, data.context or "")
    return AskResponse(answer=answer)


@router.post("/smart-task", response_model=SmartTaskResponse)
async def create_smart_task(
    data: SmartTaskRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    """Create a task from natural language. AI parses title, priority, due date, etc."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    raw_json = await ai_service.parse_task_from_text(data.text, today)

    # Parse the AI response
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI could not parse your task description. Please try rephrasing.",
        )

    # Build TaskCreate from parsed data
    priority = parsed.get("priority", "medium")
    if priority not in ("low", "medium", "high", "urgent"):
        priority = "medium"

    due_date = None
    if parsed.get("due_date"):
        try:
            due_date = datetime.fromisoformat(parsed["due_date"])
        except (ValueError, TypeError):
            pass

    task_data = TaskCreate(
        title=parsed.get("title", data.text)[:200],
        description=parsed.get("description"),
        priority=TaskPriority(priority),
        due_date=due_date,
        tags=parsed.get("tags", []),
    )

    task = await task_service.create_task(current_user.id, task_data)
    return SmartTaskResponse(
        task=task.to_response(),
        ai_interpretation=f"Title: {task_data.title} | Priority: {priority} | Due: {due_date or 'Not set'}",
    )


@router.get("/task-summary", response_model=SummaryResponse)
async def summarize_my_tasks(
    current_user: UserInDB = Depends(get_current_user),
):
    """Get an AI-generated summary of all your tasks."""
    tasks = await task_service.get_tasks_by_user(current_user.id, limit=50)
    task_dicts = [
        {
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        }
        for t in tasks
    ]
    summary = await ai_service.summarize_tasks(task_dicts)
    return SummaryResponse(summary=summary)


@router.get("/daily-briefing", response_model=BriefingResponse)
async def daily_briefing(
    current_user: UserInDB = Depends(get_current_user),
):
    """Get a motivational daily briefing based on your tasks."""
    tasks = await task_service.get_tasks_by_user(current_user.id, limit=50)
    completed_today = sum(
        1 for t in tasks
        if t.status.value == "completed"
        and t.updated_at
        and t.updated_at.date() == datetime.utcnow().date()
    )
    pending = [
        {
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        }
        for t in tasks
        if t.status.value in ("pending", "in_progress")
    ]
    briefing = await ai_service.generate_daily_briefing(
        current_user.name, pending, completed_today
    )
    return BriefingResponse(briefing=briefing)


@router.post("/draft-email", response_model=EmailDraftResponse)
async def draft_email(
    data: EmailDraftRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    """Draft an email using AI."""
    draft = await ai_service.draft_email(
        recipient=data.recipient,
        purpose=data.purpose,
        tone=data.tone,
        extra_details=data.extra_details or "",
    )
    return EmailDraftResponse(draft=draft)


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_text(
    data: RewriteRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    """Rewrite or improve text in a given style."""
    rewritten = await ai_service.rewrite_text(data.text, data.style)
    return RewriteResponse(rewritten=rewritten)
