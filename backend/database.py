import os

from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "cinestream")

# Defer opening the network connection until the app actually uses the database.
# Keep timeouts short so a temporarily unreachable Atlas DNS/server does not
# block FastAPI startup long enough for the Vite proxy to report ECONNREFUSED.
client = MongoClient(
    MONGO_URL,
    connect=False,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=5000,
)
db = client[DATABASE_NAME]


def get_db():
    """Return the MongoDB database instance."""
    return db


def get_next_id(collection_name: str) -> int:
    """Auto-increment integer ID generator using a 'counters' collection."""
    result = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]
