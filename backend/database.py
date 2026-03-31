import os

from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "cinestream")

client = MongoClient(MONGO_URL)
db = client[DATABASE_NAME]


def get_db():
    """Return the MongoDB database instance. Compatible with FastAPI Depends()."""
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
