from fastapi import APIRouter, Depends
from database import get_db

router = APIRouter(prefix="/api", tags=["system"])

@router.get("/health")
def health_check(db=Depends(get_db)):
    """Provide a lightweight health check endpoint for monitoring."""
    try:
        movie_count = db.movies.estimated_document_count()
        return {"status": "ok", "db_connected": True, "movie_count": movie_count}
    except Exception as e:
        return {"status": "degraded", "db_connected": False, "detail": str(e)}


@router.get("/testing")
def testing_uptime_robot(db=Depends(get_db)):
    """Keep the server awake by bypassing serverless spin-down."""
    try:
        db.movies.find_one({}, {"_id": 1})
        return {"status": "alive", "message": "Server is awake"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
