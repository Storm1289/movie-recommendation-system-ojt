from fastapi import HTTPException
from models.entities import Comment, Movie, User, UserRating


def build_user_activity_stats(user_doc: dict, db) -> dict:
    """Derive activity stats from persisted user data plus ratings and reviews."""
    stats = User.stats_from_doc(user_doc)
    user_id = user_doc.get("id")
    user_email = user_doc.get("email")

    rated_movie_ids = {str(movie_id) for movie_id in stats.get("ratedMovieIds", [])}
    comment_count = 0

    if user_id is not None:
        for rating_doc in db.user_ratings.find({"user_id": str(user_id)}, {"movie_id": 1}):
            movie_id = rating_doc.get("movie_id")
            if movie_id is not None:
                rated_movie_ids.add(str(movie_id))

    if user_email:
        comment_cursor = db.comments.find({"user_email": user_email}, {"movie_id": 1, "rating": 1})
        for comment_doc in comment_cursor:
            comment_count += 1
            if comment_doc.get("rating") is not None and comment_doc.get("movie_id") is not None:
                rated_movie_ids.add(str(comment_doc["movie_id"]))

    return {
        "ratedMovieIds": sorted(rated_movie_ids, key=lambda value: int(value) if str(value).isdigit() else str(value)),
        "commentCount": comment_count,
    }


def build_user_review_history(user_doc: dict, db) -> list[dict]:
    """Return review history items with linked movie details for the profile UI."""
    user_email = user_doc.get("email")
    if not user_email:
        return []

    reviews = []
    comments = list(db.comments.find({"user_email": user_email}).sort("created_at", -1))
    movie_ids = [comment.get("movie_id") for comment in comments if comment.get("movie_id") is not None]
    movies = {
        movie["id"]: movie
        for movie in db.movies.find({"id": {"$in": movie_ids}})
    } if movie_ids else {}

    for comment_doc in comments:
        movie_doc = movies.get(comment_doc.get("movie_id"))
        reviews.append({
            "comment": Comment.from_doc(comment_doc),
            "movie": Movie.from_doc(movie_doc) if movie_doc else None,
        })

    return reviews


def build_user_rating_history(user_doc: dict, db) -> list[dict]:
    """Return rating history items sourced from ratings and rated reviews."""
    user_id = user_doc.get("id")
    user_email = user_doc.get("email")
    if user_id is None and not user_email:
        return []

    history = []
    seen_entries = set()
    movie_ids = []

    if user_id is not None:
        ratings = list(db.user_ratings.find({"user_id": str(user_id)}).sort("created_at", -1))
        for rating_doc in ratings:
            movie_id = rating_doc.get("movie_id")
            if movie_id is None:
                continue
            movie_ids.append(movie_id)
            history.append({
                "kind": "rating",
                "rating": UserRating.from_doc(rating_doc),
                "movie_id": movie_id,
                "sort_key": rating_doc.get("created_at"),
            })
            seen_entries.add(("rating", movie_id))

    if user_email:
        comments = list(
            db.comments.find({"user_email": user_email, "rating": {"$ne": None}}).sort("created_at", -1)
        )
        for comment_doc in comments:
            movie_id = comment_doc.get("movie_id")
            if movie_id is None or ("rating", movie_id) in seen_entries:
                continue
            movie_ids.append(movie_id)
            history.append({
                "kind": "review",
                "rating": {
                    "id": comment_doc.get("id"),
                    "user_id": str(user_id) if user_id is not None else "anonymous",
                    "movie_id": movie_id,
                    "rating": comment_doc.get("rating"),
                    "created_at": comment_doc.get("created_at").isoformat() if hasattr(comment_doc.get("created_at"), "isoformat") else comment_doc.get("created_at"),
                },
                "movie_id": movie_id,
                "sort_key": comment_doc.get("created_at"),
            })

    movies = {
        movie["id"]: movie
        for movie in db.movies.find({"id": {"$in": movie_ids}})
    } if movie_ids else {}

    history.sort(key=lambda entry: entry.get("sort_key") or "", reverse=True)

    return [
        {
            "kind": entry["kind"],
            "rating": entry["rating"],
            "movie": Movie.from_doc(movies.get(entry["movie_id"])) if movies.get(entry["movie_id"]) else None,
        }
        for entry in history
    ]

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
        "stats": build_user_activity_stats(user_doc, db),
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
