"""
Centralized AI service powered by OpenAI.
Provides: task summarization, smart task creation from natural language,
email drafting, daily briefing, and general Q&A.
"""

from typing import Optional
from openai import AsyncOpenAI

from core.config import settings

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url="https://api.groq.com/openai/v1")
    return _client


async def _ask(
    system: str,
    user_prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.7,
) -> str:
    """Low-level helper: one-shot OpenAI chat completion."""
    client = _get_client()
    resp = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content


# ── Task Summarization ──────────────────────────────────────────────

async def summarize_tasks(tasks: list[dict]) -> str:
    """Given a list of task dicts, return a concise natural-language summary."""
    if not tasks:
        return "You have no tasks right now. Enjoy your free time!"

    task_text = "\n".join(
        f"- [{t.get('status', 'pending')}] ({t.get('priority', 'medium')}) {t['title']}"
        + (f" — due {t['due_date']}" if t.get("due_date") else "")
        for t in tasks
    )
    return await _ask(
        system=(
            "You are Orbi, a helpful AI assistant. Summarize the user's tasks "
            "into a brief, friendly overview. Highlight urgent/overdue items first. "
            "Keep it under 200 words."
        ),
        user_prompt=f"Here are my current tasks:\n{task_text}",
        max_tokens=300,
        temperature=0.5,
    )


# ── Smart Task Creation ─────────────────────────────────────────────

TASK_PARSE_SYSTEM = """\
You are Orbi, an AI assistant that converts natural language into structured task data.
Return ONLY valid JSON (no markdown fences) with these fields:
{
  "title": "short task title",
  "description": "optional longer description or null",
  "priority": "low" | "medium" | "high" | "urgent",
  "tags": ["tag1", "tag2"],
  "due_date": "YYYY-MM-DDTHH:MM:SS" or null
}
Infer priority from urgency cues. Infer due_date from relative phrases like
"tomorrow", "next Monday", etc. based on today's date provided.
If something is unclear, pick sensible defaults."""


async def parse_task_from_text(text: str, today: str) -> str:
    """Return a JSON string representing structured task data."""
    return await _ask(
        system=TASK_PARSE_SYSTEM,
        user_prompt=f"Today is {today}. Create a task from: \"{text}\"",
        max_tokens=300,
        temperature=0.3,
    )


# ── Email Drafting ──────────────────────────────────────────────────

async def draft_email(
    recipient: str,
    purpose: str,
    tone: str = "professional",
    extra_details: str = "",
) -> str:
    """Draft an email based on user parameters."""
    prompt = (
        f"Write an email to {recipient}.\n"
        f"Purpose: {purpose}\n"
        f"Tone: {tone}\n"
    )
    if extra_details:
        prompt += f"Additional details: {extra_details}\n"

    return await _ask(
        system=(
            "You are Orbi, an AI email assistant. Draft a well-structured email "
            "with Subject, Greeting, Body, and Sign-off. Keep it concise and "
            "appropriate for the requested tone."
        ),
        user_prompt=prompt,
        max_tokens=600,
        temperature=0.6,
    )


# ── Daily Briefing ──────────────────────────────────────────────────

async def generate_daily_briefing(
    user_name: str,
    tasks: list[dict],
    completed_today: int = 0,
) -> str:
    """Generate a motivational daily briefing for the user."""
    task_text = "\n".join(
        f"- [{t.get('status', 'pending')}] ({t.get('priority', 'medium')}) {t['title']}"
        + (f" — due {t['due_date']}" if t.get("due_date") else "")
        for t in tasks
    ) or "No pending tasks."

    return await _ask(
        system=(
            "You are Orbi, a friendly AI assistant. Generate a short, motivational "
            "daily briefing. Include: a greeting, task overview, priorities for "
            "today, and an encouraging closing. Keep it under 250 words."
        ),
        user_prompt=(
            f"User: {user_name}\n"
            f"Tasks completed today: {completed_today}\n"
            f"Current tasks:\n{task_text}"
        ),
        max_tokens=400,
        temperature=0.7,
    )


# ── General Q&A / Ask Anything ──────────────────────────────────────

async def ask_orbi(question: str, context: str = "") -> str:
    """General-purpose Q&A — the user asks Orbi anything."""
    prompt = question
    if context:
        prompt = f"Context: {context}\n\nQuestion: {question}"

    return await _ask(
        system=(
            "You are Orbi, a friendly and intelligent AI assistant. "
            "Answer the user's question helpfully and concisely. "
            "If you don't know something, say so honestly."
        ),
        user_prompt=prompt,
        max_tokens=1024,
        temperature=0.7,
    )


# ── Text Rewriting / Improvement ────────────────────────────────────

async def rewrite_text(text: str, style: str = "professional") -> str:
    """Rewrite or improve text in the requested style."""
    return await _ask(
        system=(
            f"You are Orbi, an AI writing assistant. Rewrite the following text "
            f"in a {style} style. Improve clarity, grammar, and flow while "
            f"preserving the original meaning."
        ),
        user_prompt=text,
        max_tokens=1024,
        temperature=0.6,
    )
