import threading
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db
from models.entities import User
from models.schemas import SettingsUpdate, ProfileUpdate, PasswordUpdate, EmailUpdate
from utils.helpers import normalize_email, make_avatar, hash_password, verify_password
from services.user_service import (
    get_user_or_404,
    build_user_state,
    build_user_activity_stats,
    build_user_rating_history,
    build_user_review_history,
    ensure_local_password_auth,
)
from services.movie_service import resolve_movie_or_fail
from services.recommendation_service import build_user_recommendations
from ranking import update_movie_score

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/{user_id}/state")
def get_user_state(user_id: int, db=Depends(get_db)):
    """Fetch the full state for a specific user."""
    user_doc = get_user_or_404(user_id, db)
    return build_user_state(user_doc, db)


@router.put("/{user_id}/settings")
def update_user_settings(user_id: int, payload: SettingsUpdate, db=Depends(get_db)):
    """Update persisted user preferences."""
    user_doc = get_user_or_404(user_id, db)
    next_settings = User.settings_from_doc(user_doc)
    updates = payload.dict(exclude_none=True)
    next_settings.update(updates)

    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "settings": next_settings,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    refreshed_user = db.users.find_one({"id": user_id})
    return {
        "settings": User.settings_from_doc(refreshed_user),
        "stats": build_user_activity_stats(refreshed_user, db),
    }


@router.put("/{user_id}/profile")
def update_user_profile(user_id: int, payload: ProfileUpdate, db=Depends(get_db)):
    """Update a user's public profile fields."""
    user_doc = get_user_or_404(user_id, db)
    name = (payload.name or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Display name is required")

    updated_fields = {
        "name": name,
        "updated_at": datetime.now(timezone.utc),
    }

    avatar = user_doc.get("avatar")
    if not avatar or (isinstance(avatar, str) and not avatar.startswith("http")):
        updated_fields["avatar"] = make_avatar(name, user_doc.get("email", ""))

    db.users.update_one({"id": user_id}, {"$set": updated_fields})

    refreshed_user = db.users.find_one({"id": user_id})
    return build_user_state(refreshed_user, db)


@router.put("/{user_id}/email")
def update_user_email(user_id: int, payload: EmailUpdate, db=Depends(get_db)):
    """Update a user's email address."""
    user_doc = get_user_or_404(user_id, db)
    ensure_local_password_auth(user_doc)

    new_email = normalize_email(payload.email)
    if not new_email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    if new_email == user_doc.get("email"):
        return build_user_state(user_doc, db)

    # Check if email is taken
    existing_user = db.users.find_one({"email": new_email})
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    current_email = user_doc.get("email")

    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "email": new_email,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    # Update email in comments as well
    if current_email:
        db.comments.update_many(
            {"user_email": current_email},
            {"$set": {"user_email": new_email}}
        )

    refreshed_user = db.users.find_one({"id": user_id})
    return build_user_state(refreshed_user, db)


@router.put("/{user_id}/password")
def update_user_password(user_id: int, payload: PasswordUpdate, db=Depends(get_db)):
    """Change the password for a local account."""
    user_doc = get_user_or_404(user_id, db)
    ensure_local_password_auth(user_doc)

    current_password = (payload.current_password or "").strip()
    new_password = (payload.new_password or "").strip()

    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    if not verify_password(current_password, user_doc):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    salt, password_hash = hash_password(new_password)
    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "password_salt": salt,
                "password_hash": password_hash,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Password updated successfully"}


@router.delete("/{user_id}")
def delete_user_account(user_id: int, db=Depends(get_db)):
    """Permanently delete a user account and roll back their ratings."""
    user_doc = get_user_or_404(user_id, db)
    user_email = normalize_email(user_doc.get("email"))
    user_id_str = str(user_id)

    comments = list(db.comments.find({"user_email": user_email})) if user_email else []
    ratings = list(db.user_ratings.find({"user_id": user_id_str}))

    movie_adjustments: dict[int, dict[str, float | int]] = {}

    def accumulate_adjustment(movie_id, rating_value):
        if movie_id is None or rating_value is None:
            return
        bucket = movie_adjustments.setdefault(movie_id, {"sum": 0.0, "count": 0})
        bucket["sum"] += float(rating_value)
        bucket["count"] += 1

    for comment in comments:
        rating_value = comment.get("rating")
        if rating_value is not None:
            accumulate_adjustment(comment.get("movie_id"), rating_value)

    for rating in ratings:
        accumulate_adjustment(rating.get("movie_id"), rating.get("rating"))

    if user_email:
        db.comments.delete_many({"user_email": user_email})
    db.user_ratings.delete_many({"user_id": user_id_str})
    db.users.delete_one({"id": user_id})

    for movie_id, adjustment in movie_adjustments.items():
        db.movies.update_one(
            {"id": movie_id},
            {
                "$inc": {
                    "user_rating_sum": -adjustment["sum"],
                    "user_rating_count": -adjustment["count"],
                }
            },
        )

        updated_movie = db.movies.find_one({"id": movie_id})
        if not updated_movie:
            continue

        safe_sum = max(float(updated_movie.get("user_rating_sum", 0.0) or 0.0), 0.0)
        safe_count = max(int(updated_movie.get("user_rating_count", 0) or 0), 0)
        if safe_sum != updated_movie.get("user_rating_sum") or safe_count != updated_movie.get("user_rating_count"):
            db.movies.update_one(
                {"id": movie_id},
                {"$set": {"user_rating_sum": safe_sum, "user_rating_count": safe_count}},
            )

        threading.Thread(target=update_movie_score, args=(movie_id,), daemon=True).start()

    return {"message": "Account deleted successfully"}


@router.post("/{user_id}/watchlist/{movie_id}")
def add_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
    """Add a movie to a user's watchlist."""
    user_doc = get_user_or_404(user_id, db)
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    watchlist_ids = user_doc.get("watchlist_ids") or []
    if movie["id"] not in watchlist_ids:
        watchlist_ids.append(movie["id"])
        db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "watchlist_ids": watchlist_ids,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    refreshed_user = db.users.find_one({"id": user_id})
    return {"watchlist": build_user_state(refreshed_user, db)["watchlist"]}


@router.delete("/{user_id}/watchlist/{movie_id}")
def remove_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
    """Remove a movie from a user's watchlist."""
    get_user_or_404(user_id, db)
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    db.users.update_one(
        {"id": user_id},
        {
            "$pull": {"watchlist_ids": movie["id"]},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    refreshed_user = db.users.find_one({"id": user_id})
    return {"watchlist": build_user_state(refreshed_user, db)["watchlist"]}


@router.get("/{user_id}/recommendations")
def recommend_for_user(user_id: int, top_n: int = Query(12, ge=1, le=30), db=Depends(get_db)):
    """Fetch personalized recommendations for a user based on their watchlist."""
    user_doc = get_user_or_404(user_id, db)
    return build_user_recommendations(user_doc, top_n, db)


@router.get("/{user_id}/reviews")
def get_user_reviews(user_id: int, db=Depends(get_db)):
    """Fetch a user's review history with linked movie details."""
    user_doc = get_user_or_404(user_id, db)
    reviews = build_user_review_history(user_doc, db)
    return {
        "count": len(reviews),
        "reviews": reviews,
    }


@router.get("/{user_id}/ratings")
def get_user_ratings(user_id: int, db=Depends(get_db)):
    """Fetch a user's explicit rating history with linked movie details."""
    user_doc = get_user_or_404(user_id, db)
    ratings = build_user_rating_history(user_doc, db)
    return {
        "count": len(ratings),
        "ratings": ratings,
    }
