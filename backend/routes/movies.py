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
INFO_IMDB_BASE_URL = "https://www.playimdb.com/title"
EXTERNAL_MOVIE_PREFIX = "external:"


def _movie_year(movie: dict) -> str:
    release_date = str(movie.get("release_date") or "")
    return release_date[:4] if len(release_date) >= 4 else ""


def _normalize_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (title or "").lower()).strip()


def _soft_normalize_title(title: str) -> str:
    normalized = _normalize_title(title)
    return re.sub(r"(.)\1+", r"\1", normalized)


def _extract_external_title(movie_id: str) -> str | None:
    movie_ref = str(movie_id or "").strip()
    if movie_ref.startswith(EXTERNAL_MOVIE_PREFIX):
        return movie_ref[len(EXTERNAL_MOVIE_PREFIX):].strip()
    return None


def _parse_external_year(title: str) -> str:
    match = re.search(r"\((\d{4})\s+film\)", title or "", re.IGNORECASE)
    return match.group(1) if match else ""


def _clean_external_title(title: str) -> str:
    return re.sub(r"\s*\(\d{4}\s+film\)\s*$", "", re.sub(r"\s*\(film\)\s*$", "", title or "", flags=re.IGNORECASE), flags=re.IGNORECASE).strip()


def _build_external_movie_payload(page_title: str) -> dict:
    from wiki_service import fetch_wiki_details

    release_year = _parse_external_year(page_title)
    details = fetch_wiki_details(page_title, release_year)
    display_title = _clean_external_title(page_title)
    release_date = f"{release_year}-01-01" if release_year else ""
    wiki_cast = details.get("wiki_cast")
    if isinstance(wiki_cast, str):
        try:
            wiki_cast = json.loads(wiki_cast)
        except (json.JSONDecodeError, TypeError):
            wiki_cast = []

    return {
        "id": f"{EXTERNAL_MOVIE_PREFIX}{page_title}",
        "tmdb_id": None,
        "title": display_title or page_title,
        "slug": None,
        "genre": details.get("genre"),
        "franchise": details.get("franchise"),
        "overview": details.get("wiki_summary") or details.get("wiki_plot") or "",
        "rating": 0.0,
        "original_rating": 0.0,
        "user_rating_count": 0,
        "release_date": release_date,
        "poster_path": details.get("poster_path"),
        "backdrop_path": details.get("poster_path"),
        "popularity": 0.0,
        "vote_count": 0,
        "monthly_score": 0.0,
        "wiki_summary": details.get("wiki_summary"),
        "wiki_plot": details.get("wiki_plot"),
        "wiki_cast": wiki_cast if isinstance(wiki_cast, list) else [],
        "wiki_director": details.get("wiki_director"),
        "wiki_budget": details.get("wiki_budget"),
        "wiki_box_office": details.get("wiki_box_office"),
        "wiki_runtime": details.get("wiki_runtime"),
        "wiki_fetched": True,
        "is_external": True,
        "route_id": f"{EXTERNAL_MOVIE_PREFIX}{page_title}",
    }


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


def _score_external_search_result(result: dict, query: str) -> int:
    query_tokens = [token for token in _normalize_title(query).split() if token]
    title_text = _normalize_title(result.get("title"))
    overview_text = _normalize_title(result.get("overview"))
    soft_title_text = _soft_normalize_title(result.get("title"))
    soft_overview_text = _soft_normalize_title(result.get("overview"))
    score = 0

    for token in query_tokens:
        if token in title_text:
            score += 5
        elif token in overview_text:
            score += 1
        elif _soft_normalize_title(token) in soft_title_text:
            score += 4
        elif _soft_normalize_title(token) in soft_overview_text:
            score += 1

    if title_text == _normalize_title(query):
        score += 8

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


def _fallback_wiki_search_results(query: str) -> list[dict]:
    from wiki_service import SESSION, WIKI_SEARCH

    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} film",
        "prop": "pageimages|extracts",
        "piprop": "thumbnail",
        "pithumbsize": 500,
        "exchars": 220,
        "exintro": 1,
        "explaintext": 1,
        "format": "json",
    }

    try:
        response = SESSION.get(WIKI_SEARCH, params=params, timeout=5)
        response.raise_for_status()
    except requests.RequestException:
        return []

    pages = response.json().get("query", {}).get("pages", {})
    results = []
    for page in pages.values():
        title = page.get("title")
        if not title:
            continue
        results.append({
            "title": title,
            "overview": page.get("extract", ""),
            "poster_path": page.get("thumbnail", {}).get("source"),
            "backdrop_path": None,
            "rating": 0.0,
            "release_date": "",
            "genre": "",
            "popularity": 0,
        })
    return results

@router.get("/api/search")
def search(q: str = "", db=Depends(get_db)):
    """Search local movies by title using a case-insensitive match."""
    if not q:
        return {"movies": []}

    regex = re.compile(re.escape(q), re.IGNORECASE)
    local_movies = list(db.movies.find({"title": {"$regex": regex}}))
    if local_movies:
        return {"movies": [Movie.from_doc(m) for m in local_movies], "source": "database"}

    from wiki_service import search_wiki_movies

    external_movies = []
    raw_external_results = search_wiki_movies(q)
    for movie in sorted(raw_external_results, key=lambda item: _score_external_search_result(item, q), reverse=True):
        title = movie.get("title")
        if not title or _score_external_search_result(movie, q) <= 0:
            continue
        external_movies.append({
            **movie,
            "id": f"{EXTERNAL_MOVIE_PREFIX}{title}",
            "route_id": f"{EXTERNAL_MOVIE_PREFIX}{title}",
            "is_external": True,
        })

    if not external_movies:
        for movie in sorted(_fallback_wiki_search_results(q), key=lambda item: _score_external_search_result(item, q), reverse=True):
            title = movie.get("title")
            if not title or _score_external_search_result(movie, q) <= 0:
                continue
            external_movies.append({
                **movie,
                "id": f"{EXTERNAL_MOVIE_PREFIX}{title}",
                "route_id": f"{EXTERNAL_MOVIE_PREFIX}{title}",
                "is_external": True,
            })

    return {"movies": external_movies, "source": "external"}


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
    external_title = _extract_external_title(movie_id)
    if external_title:
        return _build_external_movie_payload(external_title)

    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404
    return Movie.from_doc(movie)


@router.get("/api/movies/{movie_id}/recommend")
def recommend(movie_id: str, top_n: int = 10, db=Depends(get_db)):
    """Get content-based ML recommendations for a specific movie."""
    if _extract_external_title(movie_id):
        return {"recommendations": []}

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
    external_title = _extract_external_title(movie_id)
    if external_title:
        movie = {
            "title": _clean_external_title(external_title),
            "release_date": f"{_parse_external_year(external_title)}-01-01" if _parse_external_year(external_title) else "",
        }
        imdb_id = _fetch_imdb_title_id(movie.get("title") or "", _movie_year(movie))
        if not imdb_id:
            raise HTTPException(status_code=404, detail="IMDb title link not found for this movie")
    else:
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
    external_title = _extract_external_title(movie_id)
    if external_title:
        movie = _build_external_movie_payload(external_title)
        return {
            "wiki_summary": movie.get("wiki_summary"),
            "wiki_plot": movie.get("wiki_plot"),
            "wiki_cast": movie.get("wiki_cast") or [],
            "wiki_director": movie.get("wiki_director"),
            "wiki_budget": movie.get("wiki_budget"),
            "wiki_box_office": movie.get("wiki_box_office"),
            "wiki_runtime": movie.get("wiki_runtime"),
        }

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
    external_title = _extract_external_title(movie_id)
    if external_title:
        movie_title = _clean_external_title(external_title)
    else:
        movie = resolve_movie_or_fail(movie_id, db)
        if not movie:
            return {"error": "Movie not found"}, 404
        movie_title = movie["title"]

    if not country:
        country = "IN"

    from wiki_service import get_streaming_links
    links = get_streaming_links(movie_title, country)

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
