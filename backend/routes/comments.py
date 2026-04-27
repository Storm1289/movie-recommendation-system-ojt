import threading
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import get_db, get_next_id
from models.entities import Comment, Movie
from models.schemas import CommentCreate, RatingCreate
from services.movie_service import resolve_movie_or_fail
from ranking import update_movie_score

router = APIRouter(prefix="/api/movies", tags=["comments", "ratings"])

@router.get("/{movie_id}/comments")
def get_comments(movie_id: str, db=Depends(get_db)):
    """Fetch all comments and reviews for a specific movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"comments": [], "count": 0}

    comments = list(
        db.comments.find({"movie_id": movie["id"]}).sort("created_at", -1)
    )
    return {
        "comments": [Comment.from_doc(c) for c in comments],
        "count": len(comments),
    }


@router.post("/{movie_id}/comments")
def post_comment(movie_id: str, comment: CommentCreate, db=Depends(get_db)):
    """Post a new comment (and optional rating) for a movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    new_comment = {
        "id": get_next_id("comments"),
        "movie_id": movie["id"],
        "user_name": comment.user_name,
        "user_email": comment.user_email,
        "content": comment.content,
        "rating": comment.rating,
        "created_at": datetime.now(timezone.utc),
    }
    db.comments.insert_one(new_comment)

    if comment.rating is not None and 1 <= comment.rating <= 10:
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": comment.rating, "user_rating_count": 1}}
        )
        threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    if comment.user_id is not None:
        db.users.update_one(
            {"id": comment.user_id},
            {
                "$inc": {"stats.comment_count": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "comment": Comment.from_doc(new_comment),
        "movie_rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
    }


@router.post("/{movie_id}/rate")
def rate_movie(movie_id: str, rating_data: RatingCreate, db=Depends(get_db)):
    """Submit or update a user's numerical rating for a movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if not (1 <= rating_data.rating <= 10):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

    existing = db.user_ratings.find_one({
        "movie_id": movie["id"],
        "user_id": rating_data.user_id,
    })

    if existing:
        old_rating = existing["rating"]
        db.user_ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": {"rating": rating_data.rating}}
        )
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": rating_data.rating - old_rating}}
        )
    else:
        new_rating = {
            "id": get_next_id("user_ratings"),
            "movie_id": movie["id"],
            "user_id": rating_data.user_id,
            "rating": rating_data.rating,
            "created_at": datetime.now(timezone.utc),
        }
        db.user_ratings.insert_one(new_rating)
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": rating_data.rating, "user_rating_count": 1}}
        )

    try:
        parsed_user_id = int(rating_data.user_id)
    except (TypeError, ValueError):
        parsed_user_id = None

    if parsed_user_id is not None:
        db.users.update_one(
            {"id": parsed_user_id},
            {
                "$addToSet": {"stats.rated_movie_ids": movie["id"]},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
        "your_rating": rating_data.rating,
    }
