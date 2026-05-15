"""
ORBI LiveKit + Simli agent.
Uses worker framework with explicit dispatch (triggered by Node.js).
Run: python agent.py dev
"""
import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any

from aiohttp import web
from dotenv import load_dotenv

from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, WorkerType, cli
from livekit.plugins import groq, silero, simli

from edge_tts_plugin import EdgeTTS


@dataclass
class SandboxSimliConfig(simli.SimliConfig):
    """SimliConfig that sends just the face_id (no /emotion_id suffix) for user Sandbox faces."""

    def create_json(self) -> dict[str, Any]:
        return {
            "faceId": self.face_id,
            "handleSilence": True,
            "maxSessionLength": self.max_session_length,
            "maxIdleTime": self.max_idle_time,
        }

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orbi-agent")

_current_session: AgentSession | None = None
_http_started = False
_session_lock: asyncio.Lock | None = None  # created on first use (needs running loop)


async def speak_handler(request: web.Request) -> web.Response:
    global _current_session
    try:
        data = await request.json()
        text = (data.get("text") or "").strip()
        if not text:
            return web.json_response({"ok": False, "error": "empty text"}, status=400)
        if _current_session is None:
            return web.json_response({"ok": False, "error": "not ready"}, status=503)
        _current_session.say(text, allow_interruptions=True)
        logger.info("Speaking: %s", text[:80])
        return web.json_response({"ok": True})
    except Exception as e:
        logger.error("/speak error: %s", e)
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def health_handler(request: web.Request) -> web.Response:
    return web.json_response({"ok": True, "ready": _current_session is not None})


async def _start_http_bridge() -> None:
    global _http_started
    if _http_started:
        return
    _http_started = True
    app = web.Application()
    app.router.add_post("/speak", speak_handler)
    app.router.add_get("/health", health_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", 5001).start()
    logger.info("HTTP bridge listening on http://localhost:5001")


async def entrypoint(ctx: JobContext) -> None:
    global _current_session, _session_lock

    # Create the lock lazily (needs a running event loop)
    if _session_lock is None:
        _session_lock = asyncio.Lock()

    # If a session is already active, skip this dispatch to avoid conflicts
    if _session_lock.locked():
        logger.info("Session already active — skipping duplicate dispatch for room: %s", ctx.room.name)
        return

    async with _session_lock:
        await _run_session(ctx)


async def _run_session(ctx: JobContext) -> None:
    global _current_session

    await ctx.connect()
    logger.info("Agent connected to room: %s", ctx.room.name)

    # Start HTTP bridge so Node.js can send text for lip-sync
    await _start_http_bridge()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=groq.STT(model="whisper-large-v3"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=EdgeTTS(voice="en-US-JennyNeural"),
    )

    simli_avatar = simli.AvatarSession(
        simli_config=SandboxSimliConfig(
            api_key=os.environ["SIMLI_API_KEY"],
            face_id=os.environ["SIMLI_FACE_ID"],
            max_session_length=600,
            max_idle_time=300,  # 5 minutes idle before Simli disconnects
        )
    )
    logger.info("Starting Simli avatar with face_id=%s", os.environ["SIMLI_FACE_ID"])
    try:
        await simli_avatar.start(session, room=ctx.room)
        logger.info("Simli avatar started — waiting for simli-avatar-agent to join room")
    except Exception as e:
        logger.error("Simli start failed: %s", e, exc_info=True)

    # Wait up to 5 s for Simli's LiveKit participant to appear
    for _ in range(50):
        if any(p.identity == "simli-avatar-agent" for p in ctx.room.remote_participants.values()):
            logger.info("simli-avatar-agent joined — starting AgentSession")
            break
        await asyncio.sleep(0.1)
    else:
        logger.warning("simli-avatar-agent did not join within 5 s, proceeding anyway")

    # session.start() returns immediately (non-blocking by default) — the pipeline
    # runs in background tasks. Set the session reference first, then start.
    _current_session = session

    await session.start(
        agent=Agent(
            instructions=(
                "You are ORBI, a smart and friendly AI assistant. "
                "Keep responses concise — under 60 words. "
                "Speak naturally and conversationally."
            )
        ),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            audio_enabled=True,
            pre_connect_audio_timeout=10.0,
            close_on_disconnect=False,  # Keep session alive when browser disconnects/refreshes
        ),
    )

    # session.start() has returned but session tasks are still running in the background.
    # Wait here until the session actually closes (or the room disconnects).
    session_done = asyncio.Event()
    session.on("close", lambda _: session_done.set())
    ctx.room.on("disconnected", lambda: session_done.set())
    await session_done.wait()

    logger.info("ORBI session closed for room: %s", ctx.room.name)
    if _current_session is session:
        _current_session = None


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="orbi",
        )
    )
