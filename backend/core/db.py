from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,  # fail fast if MongoDB not available
    )
    db = client[settings.DATABASE_NAME]

    try:
        # Ping to verify connection
        await client.admin.command("ping")
        # Create indexes
        await db.users.create_index("email", unique=True)
        await db.tasks.create_index("user_id")
        await db.chat_messages.create_index([("user_id", 1), ("session_id", 1)])
        print(f"Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        print(f"WARNING: MongoDB not available ({e}). Endpoints requiring DB will fail.")
        print("Install MongoDB or set MONGODB_URI to a MongoDB Atlas connection string.")


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_db():
    return db
