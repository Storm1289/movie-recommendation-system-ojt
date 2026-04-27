from fastapi import HTTPException
from models.entities import Movie, User

def build_user_state(user_doc: dict, db) -> dict:
    """Build the full frontend auth state from a stored user document."""
    watchlist_ids = user_doc.get("watchlist_ids") or []
    watchlist_movies = []

    if watchlist_ids:
        movies = list(db.movies.find({"id": {"$in": watchlist_ids}}))
        movies_by_id = {movie["id"]: movie for movie in movies}
        watchlist_movies = [
            Movie.from_doc(movies_by_id[movie_id])
            for movie_id in watchlist_ids
            if movie_id in movies_by_id
        ]

    return {
        "user": User.from_doc(user_doc),
        "watchlist": watchlist_movies,
        "settings": User.settings_from_doc(user_doc),
        "stats": User.stats_from_doc(user_doc),
    }


def get_user_or_404(user_id: int, db) -> dict:
    """Fetch a user or raise a standard 404 API error."""
    user_doc = db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc


def ensure_local_password_auth(user_doc: dict):
    """Ensure password operations only run for local auth accounts."""
    if user_doc.get("password_hash") and user_doc.get("password_salt"):
        return

    raise HTTPException(
        status_code=400,
        detail="Password changes are only available for accounts created with email and password.",
    )
