from fastapi import FastAPI, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json
import threading
from sqlalchemy import or_

from database import engine, get_db, Base
from models import Movie, UserRating, Comment
from recommendation import load_model, get_recommendations
from ranking import recalculate_all_scores, update_movie_score

# Create tables
Base.metadata.create_all(bind=engine)

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

def resolve_movie_or_fail(movie_id: str, db: Session) -> Movie:
    """Resolve an integer ID or a 'wiki:Title' ID into a local database Movie object. Creates missing Wiki movies on the fly."""
    if str(movie_id).startswith("wiki:"):
        from wiki_service import fetch_wiki_details
        import urllib.parse
        title = urllib.parse.unquote(str(movie_id)[5:])
        
        movie = db.query(Movie).filter(Movie.title == title).first()
        if not movie:
            with movie_creation_lock:
                # Check again inside the lock
                movie = db.query(Movie).filter(Movie.title == title).first()
                if not movie:
                    # Create a placeholder movie to get an integer ID
                    movie = Movie(
                        title=title,
                        overview="",
                        rating=0.0
                    )
                    db.add(movie)
                    db.commit()
                    db.refresh(movie)
                    
                    # Ensure tmdb_id is populated to avoid NULLs in DB
                    movie.tmdb_id = 9000000 + movie.id
                    db.commit()
                    
                    # Immediately try to fetch Wikipedia details to populate it
                    try:
                        details = fetch_wiki_details(title, "")
                        if details.get("wiki_summary"):
                            movie.overview = details["wiki_summary"][:1000]
                        if details.get("poster_path"):
                            movie.poster_path = details["poster_path"]
                        if details.get("genre"):
                            movie.genre = details["genre"]
                        if details.get("franchise"):
                            movie.franchise = details["franchise"]
                            
                        movie.wiki_summary = details.get("wiki_summary")
                        movie.wiki_plot = details.get("wiki_plot")
                        if details.get("wiki_cast"):
                            movie.wiki_cast = details["wiki_cast"]
                        movie.wiki_director = details.get("wiki_director")
                        movie.wiki_budget = details.get("wiki_budget")
                        movie.wiki_box_office = details.get("wiki_box_office")
                        movie.wiki_runtime = details.get("wiki_runtime")
                        movie.wiki_fetched = True
                    except Exception as e:
                        print("Failed to auto-fetch wiki details on creation:", e)
                    db.commit()
            
        return movie
        
    try:
        m_id = int(movie_id)
        return db.query(Movie).filter(Movie.id == m_id).first()
    except ValueError:
        return None

@app.get("/api/search")
def search(q: str = "", db: Session = Depends(get_db)):
    if not q:
        return {"movies": []}
        
    # Local DB search only (no external/wiki augmentation)
    local_movies = db.query(Movie).filter(Movie.title.ilike(f"%{q}%")).all()
    return {"movies": [m.to_dict() for m in local_movies]}

@app.get("/api/movies")
def list_movies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    genre: str = None,
    sort_by: str = "popularity",
    db: Session = Depends(get_db),
):
    query = db.query(Movie)
    if genre:
        genres_list = [g.strip() for g in genre.split(",")]
        conditions = [Movie.genre.contains(g) for g in genres_list]
        query = query.filter(or_(*conditions))
    if sort_by == "rating":
        query = query.order_by(Movie.rating.desc())
    elif sort_by == "release_date":
        query = query.order_by(Movie.release_date.desc())
    else:
        query = query.order_by(Movie.popularity.desc())

    total = query.count()
    movies = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "movies": [m.to_dict() for m in movies],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@app.get("/api/movies/trending")
def trending_movies(db: Session = Depends(get_db)):
    movies = db.query(Movie).order_by(Movie.popularity.desc()).limit(5).all()
    return {"movies": [m.to_dict() for m in movies]}


@app.get("/api/movies/top-month")
def top_month(db: Session = Depends(get_db)):
    movies = db.query(Movie).order_by(Movie.monthly_score.desc()).limit(10).all()
    return {"movies": [m.to_dict() for m in movies]}


@app.get("/api/movies/{movie_id}")
def get_movie(movie_id: str, db: Session = Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404
    return movie.to_dict()


@app.get("/api/movies/{movie_id}/recommend")
def recommend(movie_id: str, top_n: int = 10, db: Session = Depends(get_db)):
    if not model_loaded:
        return {"recommendations": []}
    
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"recommendations": []}
        
    # get_recommendations returns a list of dictionaries with an 'id'
    recs = get_recommendations(movie.id, top_n)
    rec_movies = []
    
    for rec in recs:
        m = db.query(Movie).filter(Movie.id == rec["id"]).first()
        if m:
            rec_movies.append(m.to_dict())
            
    return {"recommendations": rec_movies}

@app.get("/api/genres")
def genres(db: Session = Depends(get_db)):
    movies = db.query(Movie.genre).distinct().all()
    genre_set = set()
    for (g,) in movies:
        if g:
            for part in g.split(","):
                genre_set.add(part.strip())
    return {"genres": sorted(genre_set)}


# ─── WIKIPEDIA DETAIL ENDPOINT ─────────────────────

@app.get("/api/movies/{movie_id}/wiki")
def get_wiki_details(movie_id: str, db: Session = Depends(get_db)):
    """Fetch Wikipedia details for a movie. Cached in DB after first fetch."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # If already fetched, return cached data
    if movie.wiki_fetched:
        return {
            "wiki_summary": movie.wiki_summary,
            "wiki_plot": movie.wiki_plot,
            "wiki_cast": json.loads(movie.wiki_cast) if movie.wiki_cast else [],
            "wiki_director": movie.wiki_director,
            "wiki_budget": movie.wiki_budget,
            "wiki_box_office": movie.wiki_box_office,
            "wiki_runtime": movie.wiki_runtime,
        }

    # Fetch from Wikipedia
    from wiki_service import fetch_wiki_details
    year = movie.release_date[:4] if movie.release_date else ""
    title = movie.title

    # Release SQLite read lock before making long network request
    db.commit()

    details = fetch_wiki_details(title, year)

    # Re-fetch because session was committed (movie might be detached)
    movie = db.query(Movie).filter(Movie.id == movie.id).first()
    if movie:
        # Cache in DB
        movie.wiki_summary = details["wiki_summary"]
        movie.wiki_plot = details["wiki_plot"]
        movie.wiki_cast = details["wiki_cast"]
        movie.wiki_director = details["wiki_director"]
        movie.wiki_budget = details["wiki_budget"]
        movie.wiki_box_office = details["wiki_box_office"]
        movie.wiki_runtime = details["wiki_runtime"]
        movie.wiki_fetched = True
        db.commit()

    return {
        "wiki_summary": details["wiki_summary"],
        "wiki_plot": details["wiki_plot"],
        "wiki_cast": json.loads(details["wiki_cast"]) if details["wiki_cast"] else [],
        "wiki_director": details["wiki_director"],
        "wiki_budget": details["wiki_budget"],
        "wiki_box_office": details["wiki_box_office"],
        "wiki_runtime": details["wiki_runtime"],
    }


# ─── COMMENTS ENDPOINTS ────────────────────────────

@app.get("/api/movies/{movie_id}/comments")
def get_comments(movie_id: str, db: Session = Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"comments": [], "count": 0}
        
    comments = db.query(Comment).filter(
        Comment.movie_id == movie.id
    ).order_by(Comment.created_at.desc()).all()
    return {"comments": [c.to_dict() for c in comments], "count": len(comments)}


@app.post("/api/movies/{movie_id}/comments")
def post_comment(movie_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    new_comment = Comment(
        movie_id=movie.id,
        user_name=comment.user_name,
        user_email=comment.user_email,
        content=comment.content,
        rating=comment.rating,
    )
    db.add(new_comment)

    # If the comment includes a rating, update the movie's aggregated rating
    if comment.rating is not None and 1 <= comment.rating <= 10:
        movie.user_rating_sum = (movie.user_rating_sum or 0) + comment.rating
        movie.user_rating_count = (movie.user_rating_count or 0) + 1
        db.commit()
        db.refresh(new_comment)
        # Recalculate global top 10 score dynamically based on the new rating
        threading.Thread(target=update_movie_score, args=(movie.id,), daemon=True).start()
    else:
        db.commit()
        db.refresh(new_comment)

    return {
        "comment": new_comment.to_dict(),
        "movie_rating": movie.to_dict()["rating"],
        "user_rating_count": movie.user_rating_count or 0,
    }


# ─── RATING ENDPOINT ───────────────────────────────

@app.post("/api/movies/{movie_id}/rate")
def rate_movie(movie_id: str, rating_data: RatingCreate, db: Session = Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    if not (1 <= rating_data.rating <= 10):
        return {"error": "Rating must be between 1 and 10"}

    # Check if user already rated
    existing = db.query(UserRating).filter(
        UserRating.movie_id == movie.id,
        UserRating.user_id == rating_data.user_id,
    ).first()

    if existing:
        # Update: subtract old, add new
        movie.user_rating_sum = (movie.user_rating_sum or 0) - existing.rating + rating_data.rating
        existing.rating = rating_data.rating
    else:
        # New rating
        new_rating = UserRating(
            movie_id=movie.id,
            user_id=rating_data.user_id,
            rating=rating_data.rating,
        )
        db.add(new_rating)
        movie.user_rating_sum = (movie.user_rating_sum or 0) + rating_data.rating
        movie.user_rating_count = (movie.user_rating_count or 0) + 1

    db.commit()

    # Recalculate dynamic tracking score for this movie since rating changed
    threading.Thread(target=update_movie_score, args=(movie.id,), daemon=True).start()

    return {
        "rating": movie.to_dict()["rating"],
        "user_rating_count": movie.user_rating_count,
        "your_rating": rating_data.rating,
    }


# ─── STREAMING PLATFORMS (REGION-AWARE) ─────────────

@app.get("/api/movies/{movie_id}/streaming")
def get_streaming(movie_id: str, request: Request, country: str = None, db: Session = Depends(get_db)):
    """Get streaming platform links based on user's country."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # Detect country from query param or request header
    if not country:
        # Try to detect from X-Forwarded-For or fall back
        # In production, use a proper geo-IP service
        country = "IN"  # Default to India for now

    from wiki_service import get_streaming_links
    links = get_streaming_links(movie.title, country)

    return {
        "country": country,
        "platforms": links,
    }
