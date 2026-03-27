from fastapi import FastAPI, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import threading
import re

from database import get_db, get_next_id
from models import Movie, Comment
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


# ─── LOAD RECOMMENDATION MODEL ─────────────────────
model_loaded = False

@app.on_event("startup")
def startup():
    global model_loaded
    similarity, df = load_model()
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
    user_name: str = "Anonymous"
    user_email: Optional[str] = None
    content: str
    rating: Optional[float] = None  # 1-10

class RatingCreate(BaseModel):
    user_id: str = "anonymous"
    rating: float  # 1-10


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
        return {"error": "Movie not found"}, 404

    from datetime import datetime, timezone
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
        return {"error": "Movie not found"}, 404

    if not (1 <= rating_data.rating <= 10):
        return {"error": "Rating must be between 1 and 10"}

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
        from datetime import datetime, timezone
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
