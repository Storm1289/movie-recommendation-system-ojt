import re
import threading
from models.entities import sanitize_genre_string, make_movie_slug
from database import get_next_id

movie_creation_lock = threading.Lock()

def split_movie_genres(movie: dict) -> set[str]:
    """Extract and normalize genres from a movie document."""
    clean_genres = sanitize_genre_string(movie.get("genre") or "") or ""
    return {genre.lower() for genre in clean_genres.split(", ") if genre}


def extract_movie_keywords(movie: dict) -> set[str]:
    """Extract searchable keywords from movie metadata."""
    text = " ".join(
        str(movie.get(field) or "")
        for field in ("overview", "wiki_summary", "wiki_plot", "franchise", "wiki_director")
    ).lower()
    words = re.findall(r"[a-z0-9]{4,}", text)
    common_words = {
        "about", "after", "also", "being", "from", "have", "into", "their", "they",
        "this", "when", "where", "while", "with", "young", "must", "film", "movie",
    }
    return {word for word in words if word not in common_words}


def normalized_popularity(movie: dict, max_popularity: float) -> float:
    """Calculate a normalized popularity score between 0 and 1."""
    if max_popularity <= 0:
        return 0.0
    return min(float(movie.get("popularity", 0.0) or 0.0) / max_popularity, 1.0)


def trending_movie_docs(db, limit: int = 10, exclude_ids: set[int] | None = None) -> list[dict]:
    """Fetch the most popular trending movies from the database."""
    exclude_ids = exclude_ids or set()
    query = {"poster_path": {"$ne": None}}
    if exclude_ids:
        query["id"] = {"$nin": list(exclude_ids)}

    return list(db.movies.find(query).sort("popularity", -1).limit(limit))


def resolve_movie_or_fail(movie_id: str, db) -> dict:
    """Resolve an ID or a 'wiki:Title' slug into a local database movie document."""
    movie_ref = str(movie_id or "").strip()

    if movie_ref.startswith("wiki:"):
        from wiki_service import fetch_wiki_details
        import urllib.parse
        title = urllib.parse.unquote(movie_ref[5:])

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
                        cleaned_genre = sanitize_genre_string(details.get("genre"))
                        if cleaned_genre:
                            update_fields["genre"] = cleaned_genre
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
        m_id = int(movie_ref)
        return db.movies.find_one({"id": m_id})
    except ValueError:
        slug = movie_ref.lower().strip("/")
        if not slug:
            return None

        title_guess = re.sub(r"[-_]+", " ", slug).strip()
        if title_guess:
            exact_title = re.compile(f"^{re.escape(title_guess)}$", re.IGNORECASE)
            movie = db.movies.find_one({"title": {"$regex": exact_title}})
            if movie:
                return movie

        token_pattern = r"[\W_]+".join(re.escape(token) for token in slug.split("-") if token)
        if token_pattern:
            title_pattern = re.compile(f"^{token_pattern}$", re.IGNORECASE)
            movie = db.movies.find_one({"title": {"$regex": title_pattern}})
            if movie:
                return movie

        for movie in db.movies.find({}, {"title": 1, "id": 1}):
            if make_movie_slug(movie.get("title")) == slug:
                return db.movies.find_one({"id": movie["id"]})

        return None
