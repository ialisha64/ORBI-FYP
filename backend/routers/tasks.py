from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from models.task import TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskPriority
from models.user import UserInDB
from services.task_service import (
    create_task,
    get_task_by_id,
    get_tasks_by_user,
    get_task_stats,
    update_task,
    delete_task,
)
from core.security import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    data: TaskCreate,
    current_user: UserInDB = Depends(get_current_user),
):
    task = await create_task(current_user.id, data)
    return task.to_response()


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserInDB = Depends(get_current_user),
):
    tasks = await get_tasks_by_user(
        current_user.id,
        status_filter=status_filter,
        priority_filter=priority,
        skip=skip,
        limit=limit,
    )
    return [t.to_response() for t in tasks]


@router.get("/stats")
async def task_stats(current_user: UserInDB = Depends(get_current_user)):
    return await get_task_stats(current_user.id)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    task = await get_task_by_id(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task.to_response()


@router.put("/{task_id}", response_model=TaskResponse)
async def update_existing_task(
    task_id: str,
    data: TaskUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    task = await update_task(task_id, current_user.id, data)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task.to_response()


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    success = await delete_task(task_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
