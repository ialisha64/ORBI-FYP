from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from core.db import connect_db, close_db
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.tasks import router as tasks_router
from routers.chat import router as chat_router
from routers.ai import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Backend API for Orbi - AI-Powered Virtual Assistant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tasks_router)
app.include_router(chat_router)
app.include_router(ai_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
