import re
import json
from urllib.parse import quote

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from database import get_db
from models.entities import Movie
from services.movie_service import resolve_movie_or_fail
from recommendation import get_recommendations

router = APIRouter(tags=["movies"])

IMDB_SUGGEST_URL = "https://v3.sg.media-imdb.com/suggestion/x/{query}.json"
INFO_IMDB_BASE_URL = "https://www.infoimdb.com/title"


def _movie_year(movie: dict) -> str:
    release_date = str(movie.get("release_date") or "")
    return release_date[:4] if len(release_date) >= 4 else ""


def _normalize_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (title or "").lower()).strip()


def _score_imdb_candidate(candidate: dict, title: str, year: str) -> int:
    candidate_title = _normalize_title(candidate.get("l"))
    target_title = _normalize_title(title)
    score = 0

    if candidate_title == target_title:
        score += 8
    elif target_title and (target_title in candidate_title or candidate_title in target_title):
        score += 4

    if year and str(candidate.get("y") or "") == year:
        score += 5

    if candidate.get("qid") in {"movie", "tvMovie", "tvSeries"}:
        score += 3
    if candidate.get("q") in {"feature", "TV series"}:
        score += 2

    rank = candidate.get("rank")
    if isinstance(rank, int):
        score += max(0, 3 - min(rank // 5000, 3))

    return score


def _fetch_imdb_title_id(title: str, year: str) -> str | None:
    query = quote(f"{title} {year}".strip())

    try:
        response = requests.get(IMDB_SUGGEST_URL.format(query=query), timeout=8)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Unable to fetch IMDb title link right now") from exc

    candidates = [
        candidate for candidate in payload.get("d", [])
        if isinstance(candidate, dict) and str(candidate.get("id", "")).startswith("tt")
    ]
    if not candidates:
        return None

    best = max(candidates, key=lambda candidate: _score_imdb_candidate(candidate, title, year))
    if _score_imdb_candidate(best, title, year) <= 0:
        return None

    return best["id"]

@router.get("/api/search")
def search(q: str = "", db=Depends(get_db)):
    """Search local movies by title using a case-insensitive match."""
    if not q:
        return {"movies": []}

    regex = re.compile(re.escape(q), re.IGNORECASE)
    local_movies = list(db.movies.find({"title": {"$regex": regex}}))
    return {"movies": [Movie.from_doc(m) for m in local_movies]}


@router.get("/api/movies")
def list_movies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    genre: str = None,
    director: str = None,
    sort_by: str = "popularity",
    db=Depends(get_db),
):
    """Fetch paginated movies with optional filtering and sorting."""
    and_conditions = []
    if genre:
        genres_list = [g.strip() for g in genre.split(",")]
        for g in genres_list:
            and_conditions.append({"genre": {"$regex": re.escape(g), "$options": "i"}})

    if director:
        directors_list = [d.strip() for d in director.split(",")]
        and_conditions.append({"$or": [{"wiki_director": {"$regex": re.escape(d), "$options": "i"}} for d in directors_list]})

    query_filter = {}
    if and_conditions:
        query_filter = {"$and": and_conditions} if len(and_conditions) > 1 else and_conditions[0]

    if sort_by == "rating":
        sort_field = [("rating", -1)]
    elif sort_by == "release_date":
        sort_field = [("release_date", -1)]
    elif sort_by == "random":
        sort_field = None
    else:
        sort_field = [("popularity", -1)]

    total = db.movies.count_documents(query_filter)

    if total == 0 and and_conditions:
        or_conditions = []
        if genre:
            for g in genres_list:
                or_conditions.append({"genre": {"$regex": re.escape(g), "$options": "i"}})
        if director:
            for d in directors_list:
                or_conditions.append({"wiki_director": {"$regex": re.escape(d), "$options": "i"}})

        fallback_query = {"$or": or_conditions}
        total = db.movies.count_documents(fallback_query)

        pipeline = [
            {"$match": fallback_query},
            {"$sample": {"size": per_page}}
        ]
        movies = list(db.movies.aggregate(pipeline))
    else:
        if sort_by == "random":
            pipeline = [
                {"$match": query_filter},
                {"$sample": {"size": per_page}}
            ]
            movies = list(db.movies.aggregate(pipeline))
        else:
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


@router.get("/api/movies/trending")
def trending_movies(db=Depends(get_db)):
    """Fetch a randomized sample of the top trending movies."""
    pipeline = [
        {"$sort": {"popularity": -1}},
        {"$limit": 30},
        {"$sample": {"size": 5}}
    ]
    movies = list(db.movies.aggregate(pipeline))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@router.get("/api/movies/top-month")
def top_month(db=Depends(get_db)):
    """Fetch a randomized sample of the highest monthly rated movies."""
    pipeline = [
        {"$sort": {"monthly_score": -1}},
        {"$limit": 40},
        {"$sample": {"size": 10}}
    ]
    movies = list(db.movies.aggregate(pipeline))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@router.get("/api/movies/{movie_id}")
def get_movie(movie_id: str, db=Depends(get_db)):
    """Fetch a single movie by its ID or slug."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404
    return Movie.from_doc(movie)


@router.get("/api/movies/{movie_id}/recommend")
def recommend(movie_id: str, top_n: int = 10, db=Depends(get_db)):
    """Get content-based ML recommendations for a specific movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"recommendations": []}

    recs = get_recommendations(movie["id"], top_n)
    rec_movies = []

    for rec in recs:
        m = db.movies.find_one({"id": rec["id"]})
        if m:
            rec_movies.append(Movie.from_doc(m))

    return {"recommendations": rec_movies}


@router.get("/api/movies/{movie_id}/watch-url")
def get_watch_movie_url(movie_id: str, db=Depends(get_db)):
    """Resolve a movie's IMDb title and return the matching infoimdb URL."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    imdb_id = movie.get("imdb_id")
    if not imdb_id:
        imdb_id = _fetch_imdb_title_id(movie.get("title") or "", _movie_year(movie))
        if not imdb_id:
            raise HTTPException(status_code=404, detail="IMDb title link not found for this movie")

        db.movies.update_one(
            {"id": movie["id"]},
            {"$set": {"imdb_id": imdb_id}},
        )

    imdb_url = f"https://www.imdb.com/title/{imdb_id}/"
    watch_url = f"{INFO_IMDB_BASE_URL}/{imdb_id}/"

    return {
        "imdb_id": imdb_id,
        "imdb_url": imdb_url,
        "watch_url": watch_url,
    }


@router.get("/api/movies/{movie_id}/wiki")
def get_wiki_details(movie_id: str, db=Depends(get_db)):
    """Fetch and cache Wikipedia details for a movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

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

    from wiki_service import fetch_wiki_details
    year = movie.get("release_date", "")[:4] if movie.get("release_date") else ""
    title = movie["title"]

    details = fetch_wiki_details(title, year)

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


@router.get("/api/movies/{movie_id}/streaming")
def get_streaming(movie_id: str, request: Request, country: str = None, db=Depends(get_db)):
    """Fetch region-aware streaming links for a movie."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    if not country:
        country = "IN"

    from wiki_service import get_streaming_links
    links = get_streaming_links(movie["title"], country)

    return {
        "country": country,
        "platforms": links,
    }


@router.get("/api/genres")
def get_genres(db=Depends(get_db)):
    """Fetch all available distinct genres in the database."""
    pipeline = [
        {"$project": {"genres": {"$split": ["$genre", ", "]}}},
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres"}},
        {"$sort": {"_id": 1}}
    ]
    genres_raw = [doc["_id"] for doc in db.movies.aggregate(pipeline) if doc["_id"]]
    genres = [g for g in genres_raw if len(g) <= 20 and g.count(" ") <= 1 and "\n" not in g]
    return {"genres": genres}


@router.get("/api/directors")
def get_directors(db=Depends(get_db)):
    """Fetch the top directors in the database."""
    pipeline = [
        {"$match": {"wiki_director": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$wiki_director", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    directors = [doc["_id"] for doc in db.movies.aggregate(pipeline) if doc["_id"]]
    return {"directors": directors}
