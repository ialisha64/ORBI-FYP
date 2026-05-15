from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from core.db import get_db
from models.task import TaskCreate, TaskUpdate, TaskInDB, TaskStatus


async def create_task(user_id: str, data: TaskCreate) -> TaskInDB:
    db = get_db()

    task_doc = {
        "user_id": user_id,
        "title": data.title,
        "description": data.description,
        "status": data.status.value,
        "priority": data.priority.value,
        "due_date": data.due_date,
        "tags": data.tags,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id
    return TaskInDB.from_mongo(task_doc)


async def get_task_by_id(task_id: str, user_id: str) -> Optional[TaskInDB]:
    db = get_db()
    try:
        doc = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user_id})
    except Exception:
        return None
    if doc:
        return TaskInDB.from_mongo(doc)
    return None


async def get_tasks_by_user(
    user_id: str,
    status_filter: Optional[TaskStatus] = None,
    priority_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[TaskInDB]:
    db = get_db()
    query: dict = {"user_id": user_id}

    if status_filter:
        query["status"] = status_filter.value
    if priority_filter:
        query["priority"] = priority_filter

    cursor = db.tasks.find(query).sort("created_at", -1).skip(skip).limit(limit)
    tasks = []
    async for doc in cursor:
        tasks.append(TaskInDB.from_mongo(doc))
    return tasks


async def get_task_stats(user_id: str) -> dict:
    db = get_db()
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    cursor = db.tasks.aggregate(pipeline)
    stats = {"pending": 0, "in_progress": 0, "completed": 0, "cancelled": 0, "total": 0}
    async for doc in cursor:
        key = doc["_id"]
        if key in stats:
            stats[key] = doc["count"]
        stats["total"] += doc["count"]
    return stats


async def update_task(task_id: str, user_id: str, data: TaskUpdate) -> Optional[TaskInDB]:
    db = get_db()
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        return await get_task_by_id(task_id, user_id)

    # Serialize enums to string values
    if "status" in update_fields and hasattr(update_fields["status"], "value"):
        update_fields["status"] = update_fields["status"].value
    if "priority" in update_fields and hasattr(update_fields["priority"], "value"):
        update_fields["priority"] = update_fields["priority"].value

    update_fields["updated_at"] = datetime.utcnow()

    try:
        result = await db.tasks.find_one_and_update(
            {"_id": ObjectId(task_id), "user_id": user_id},
            {"$set": update_fields},
            return_document=True,
        )
    except Exception:
        return None

    if result:
        return TaskInDB.from_mongo(result)
    return None


async def delete_task(task_id: str, user_id: str) -> bool:
    db = get_db()
    try:
        result = await db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user_id})
        return result.deleted_count == 1
    except Exception:
        return False
