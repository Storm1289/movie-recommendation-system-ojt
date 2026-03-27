from fastapi import FastAPI, Depends, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import threading
import re
import hashlib
import secrets
from datetime import datetime, timezone

from pymongo.errors import DuplicateKeyError

from database import get_db, get_next_id
from models import Movie, Comment, User, DEFAULT_USER_SETTINGS, DEFAULT_USER_STATS
from recommendation import load_model, get_recommendations
from ranking import recalculate_all_scores, update_movie_score

app = FastAPI(title="CineStream API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_unique_index(collection, keys, name: str):
    expected_key = dict(keys)
    existing_indexes = list(collection.list_indexes())

    for index in existing_indexes:
        if dict(index.get("key", {})) != expected_key:
            continue

        if index.get("unique") is True:
            if index.get("name") != name:
                collection.drop_index(index["name"])
                collection.create_index(keys, name=name, unique=True)
            return

        collection.drop_index(index["name"])
        break

    collection.create_index(keys, name=name, unique=True)


# ─── LOAD RECOMMENDATION MODEL ─────────────────────
model_loaded = False

@app.on_event("startup")
def startup():
    global model_loaded
    similarity, df = load_model()
    db = get_db()
    ensure_unique_index(db.users, [("email", 1)], "users_email_unique")
    ensure_unique_index(
        db.user_ratings,
        [("movie_id", 1), ("user_id", 1)],
        "user_ratings_movie_user_unique",
    )

    if similarity is not None and df is not None:
        model_loaded = True
        print(f"✅ Model loaded on startup ({len(df)} movies)")
    else:
        print("⚠️ No pickled model found — run seed.py first")

    # Start a background thread to recalculate all rankings dynamically on startup
    threading.Thread(target=recalculate_all_scores, daemon=True).start()
    print("📈 Triggered background calculation of Dynamic Monthly Top 10 Scores.")


# ─── PYDANTIC SCHEMAS ──────────────────────────────

class CommentCreate(BaseModel):
    user_id: Optional[int] = None
    user_name: str = "Anonymous"
    user_email: Optional[str] = None
    content: str
    rating: Optional[float] = None  # 1-10

class RatingCreate(BaseModel):
    user_id: str = "anonymous"
    rating: float  # 1-10


class SignupCreate(BaseModel):
    name: str
    email: str
    password: str


class LoginCreate(BaseModel):
    email: str
    password: str


class SettingsUpdate(BaseModel):
    darkMode: Optional[bool] = None
    autoplay: Optional[bool] = None
    notifications: Optional[bool] = None
    emailDigest: Optional[bool] = None
    language: Optional[str] = None
    quality: Optional[str] = None


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    ).hex()
    return salt, password_hash


def verify_password(password: str, user_doc: dict) -> bool:
    salt = user_doc.get("password_salt")
    expected_hash = user_doc.get("password_hash")
    if not salt or not expected_hash:
        return False
    _, password_hash = hash_password(password, salt)
    return password_hash == expected_hash


def make_avatar(name: str, email: str) -> str:
    source = (name or "").strip() or normalize_email(email)
    return source[:1].upper() if source else "C"


def build_user_state(user_doc: dict, db) -> dict:
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
    user_doc = db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc


# ─── USER ENDPOINTS ────────────────────────────────

@app.post("/api/auth/signup")
def signup(payload: SignupCreate, db=Depends(get_db)):
    name = payload.name.strip()
    email = normalize_email(payload.email)
    password = payload.password.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    salt, password_hash = hash_password(password)
    now = datetime.now(timezone.utc)
    new_user = {
        "id": get_next_id("users"),
        "name": name,
        "email": email,
        "avatar": make_avatar(name, email),
        "password_salt": salt,
        "password_hash": password_hash,
        "watchlist_ids": [],
        "settings": DEFAULT_USER_SETTINGS.copy(),
        "stats": DEFAULT_USER_STATS.copy(),
        "created_at": now,
        "updated_at": now,
    }

    try:
        db.users.insert_one(new_user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    return build_user_state(new_user, db)


@app.post("/api/auth/login")
def login(payload: LoginCreate, db=Depends(get_db)):
    email = normalize_email(payload.email)
    user_doc = db.users.find_one({"email": email})

    if not user_doc or not verify_password(payload.password, user_doc):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return build_user_state(user_doc, db)


@app.get("/api/users/{user_id}/state")
def get_user_state(user_id: int, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    return build_user_state(user_doc, db)


@app.put("/api/users/{user_id}/settings")
def update_user_settings(user_id: int, payload: SettingsUpdate, db=Depends(get_db)):
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
        "stats": User.stats_from_doc(refreshed_user),
    }


@app.post("/api/users/{user_id}/watchlist/{movie_id}")
def add_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
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


@app.delete("/api/users/{user_id}/watchlist/{movie_id}")
def remove_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
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


# ─── MOVIE ENDPOINTS ───────────────────────────────

movie_creation_lock = threading.Lock()

def resolve_movie_or_fail(movie_id: str, db) -> dict:
    """Resolve an integer ID or a 'wiki:Title' ID into a local database movie document. Creates missing Wiki movies on the fly."""
    if str(movie_id).startswith("wiki:"):
        from wiki_service import fetch_wiki_details
        import urllib.parse
        title = urllib.parse.unquote(str(movie_id)[5:])

        movie = db.movies.find_one({"title": title})
        if not movie:
            with movie_creation_lock:
                # Check again inside the lock
                movie = db.movies.find_one({"title": title})
                if not movie:
                    new_id = get_next_id("movies")
                    movie = {
                        "id": new_id,
                        "tmdb_id": 9000000 + new_id,
                        "title": title,
                        "overview": "",
                        "rating": 0.0,
                        "genre": None,
                        "release_date": None,
                        "poster_path": None,
                        "backdrop_path": None,
                        "popularity": 0.0,
                        "vote_count": 0,
                        "user_rating_sum": 0.0,
                        "user_rating_count": 0,
                        "monthly_score": 0.0,
                        "franchise": None,
                        "wiki_fetched": False,
                    }
                    db.movies.insert_one(movie)

                    # Immediately try to fetch Wikipedia details to populate it
                    try:
                        details = fetch_wiki_details(title, "")
                        update_fields = {}
                        if details.get("wiki_summary"):
                            update_fields["overview"] = details["wiki_summary"][:1000]
                        if details.get("poster_path"):
                            update_fields["poster_path"] = details["poster_path"]
                        if details.get("genre"):
                            update_fields["genre"] = details["genre"]
                        if details.get("franchise"):
                            update_fields["franchise"] = details["franchise"]

                        update_fields["wiki_summary"] = details.get("wiki_summary")
                        update_fields["wiki_plot"] = details.get("wiki_plot")
                        if details.get("wiki_cast"):
                            update_fields["wiki_cast"] = details["wiki_cast"]
                        update_fields["wiki_director"] = details.get("wiki_director")
                        update_fields["wiki_budget"] = details.get("wiki_budget")
                        update_fields["wiki_box_office"] = details.get("wiki_box_office")
                        update_fields["wiki_runtime"] = details.get("wiki_runtime")
                        update_fields["wiki_fetched"] = True

                        if update_fields:
                            db.movies.update_one({"id": new_id}, {"$set": update_fields})
                    except Exception as e:
                        print("Failed to auto-fetch wiki details on creation:", e)

                    movie = db.movies.find_one({"id": new_id})

        return movie

    try:
        m_id = int(movie_id)
        return db.movies.find_one({"id": m_id})
    except ValueError:
        return None

@app.get("/api/search")
def search(q: str = "", db=Depends(get_db)):
    if not q:
        return {"movies": []}

    # Local DB search only (case-insensitive regex)
    regex = re.compile(re.escape(q), re.IGNORECASE)
    local_movies = list(db.movies.find({"title": {"$regex": regex}}))
    return {"movies": [Movie.from_doc(m) for m in local_movies]}

@app.get("/api/movies")
def list_movies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    genre: str = None,
    sort_by: str = "popularity",
    db=Depends(get_db),
):
    query_filter = {}
    if genre:
        genres_list = [g.strip() for g in genre.split(",")]
        # Match any of the genres (case-insensitive contains)
        conditions = [{"genre": {"$regex": re.escape(g), "$options": "i"}} for g in genres_list]
        query_filter["$or"] = conditions

    # Determine sort field
    if sort_by == "rating":
        sort_field = [("rating", -1)]
    elif sort_by == "release_date":
        sort_field = [("release_date", -1)]
    else:
        sort_field = [("popularity", -1)]

    total = db.movies.count_documents(query_filter)
    movies = list(
        db.movies.find(query_filter)
        .sort(sort_field)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    return {
        "movies": [Movie.from_doc(m) for m in movies],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@app.get("/api/movies/trending")
def trending_movies(db=Depends(get_db)):
    movies = list(db.movies.find().sort("popularity", -1).limit(5))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@app.get("/api/movies/top-month")
def top_month(db=Depends(get_db)):
    movies = list(db.movies.find().sort("monthly_score", -1).limit(10))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@app.get("/api/movies/{movie_id}")
def get_movie(movie_id: str, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404
    return Movie.from_doc(movie)


@app.get("/api/movies/{movie_id}/recommend")
def recommend(movie_id: str, top_n: int = 10, db=Depends(get_db)):
    if not model_loaded:
        return {"recommendations": []}

    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"recommendations": []}

    # get_recommendations returns a list of dictionaries with an 'id'
    recs = get_recommendations(movie["id"], top_n)
    rec_movies = []

    for rec in recs:
        m = db.movies.find_one({"id": rec["id"]})
        if m:
            rec_movies.append(Movie.from_doc(m))

    return {"recommendations": rec_movies}

@app.get("/api/genres")
def genres(db=Depends(get_db)):
    movies = db.movies.find({"genre": {"$ne": None}}, {"genre": 1})
    genre_set = set()
    for m in movies:
        g = m.get("genre")
        if g:
            for part in g.split(","):
                genre_set.add(part.strip())
    return {"genres": sorted(genre_set)}


# ─── WIKIPEDIA DETAIL ENDPOINT ─────────────────────

@app.get("/api/movies/{movie_id}/wiki")
def get_wiki_details(movie_id: str, db=Depends(get_db)):
    """Fetch Wikipedia details for a movie. Cached in DB after first fetch."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # If already fetched, return cached data
    if movie.get("wiki_fetched"):
        wiki_cast = movie.get("wiki_cast")
        if isinstance(wiki_cast, str):
            try:
                wiki_cast = json.loads(wiki_cast)
            except (json.JSONDecodeError, TypeError):
                wiki_cast = []
        elif not isinstance(wiki_cast, list):
            wiki_cast = []

        return {
            "wiki_summary": movie.get("wiki_summary"),
            "wiki_plot": movie.get("wiki_plot"),
            "wiki_cast": wiki_cast,
            "wiki_director": movie.get("wiki_director"),
            "wiki_budget": movie.get("wiki_budget"),
            "wiki_box_office": movie.get("wiki_box_office"),
            "wiki_runtime": movie.get("wiki_runtime"),
        }

    # Fetch from Wikipedia
    from wiki_service import fetch_wiki_details
    year = movie.get("release_date", "")[:4] if movie.get("release_date") else ""
    title = movie["title"]

    details = fetch_wiki_details(title, year)

    # Cache in DB
    db.movies.update_one(
        {"id": movie["id"]},
        {"$set": {
            "wiki_summary": details["wiki_summary"],
            "wiki_plot": details["wiki_plot"],
            "wiki_cast": details["wiki_cast"],
            "wiki_director": details["wiki_director"],
            "wiki_budget": details["wiki_budget"],
            "wiki_box_office": details["wiki_box_office"],
            "wiki_runtime": details["wiki_runtime"],
            "wiki_fetched": True,
        }}
    )

    wiki_cast = details.get("wiki_cast")
    if isinstance(wiki_cast, str):
        try:
            wiki_cast = json.loads(wiki_cast)
        except (json.JSONDecodeError, TypeError):
            wiki_cast = []
    elif not isinstance(wiki_cast, list):
        wiki_cast = []

    return {
        "wiki_summary": details["wiki_summary"],
        "wiki_plot": details["wiki_plot"],
        "wiki_cast": wiki_cast,
        "wiki_director": details["wiki_director"],
        "wiki_budget": details["wiki_budget"],
        "wiki_box_office": details["wiki_box_office"],
        "wiki_runtime": details["wiki_runtime"],
    }


# ─── COMMENTS ENDPOINTS ────────────────────────────

@app.get("/api/movies/{movie_id}/comments")
def get_comments(movie_id: str, db=Depends(get_db)):
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


@app.post("/api/movies/{movie_id}/comments")
def post_comment(movie_id: str, comment: CommentCreate, db=Depends(get_db)):
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

    # If the comment includes a rating, update the movie's aggregated rating
    if comment.rating is not None and 1 <= comment.rating <= 10:
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": comment.rating, "user_rating_count": 1}}
        )
        # Recalculate global top 10 score dynamically based on the new rating
        threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    if comment.user_id is not None:
        db.users.update_one(
            {"id": comment.user_id},
            {
                "$inc": {"stats.comment_count": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    # Re-fetch movie for updated rating
    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "comment": Comment.from_doc(new_comment),
        "movie_rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
    }


# ─── RATING ENDPOINT ───────────────────────────────

@app.post("/api/movies/{movie_id}/rate")
def rate_movie(movie_id: str, rating_data: RatingCreate, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if not (1 <= rating_data.rating <= 10):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

    # Check if user already rated
    existing = db.user_ratings.find_one({
        "movie_id": movie["id"],
        "user_id": rating_data.user_id,
    })

    if existing:
        # Update: subtract old, add new
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
        # New rating
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

    # Recalculate dynamic tracking score for this movie since rating changed
    threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    # Re-fetch for latest data
    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
        "your_rating": rating_data.rating,
    }


# ─── STREAMING PLATFORMS (REGION-AWARE) ─────────────

@app.get("/api/movies/{movie_id}/streaming")
def get_streaming(movie_id: str, request: Request, country: str = None, db=Depends(get_db)):
    """Get streaming platform links based on user's country."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # Detect country from query param or request header
    if not country:
        country = "IN"  # Default to India for now

    from wiki_service import get_streaming_links
    links = get_streaming_links(movie["title"], country)

    return {
        "country": country,
        "platforms": links,
    }
