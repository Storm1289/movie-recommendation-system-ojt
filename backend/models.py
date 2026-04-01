"""
MongoDB document models for CineStream.
Plain Python classes that convert between MongoDB docs and API-friendly dicts.
"""

import re
from datetime import datetime, timezone


DEFAULT_USER_SETTINGS = {
    "darkMode": True,
    "autoplay": True,
    "notifications": True,
    "emailDigest": False,
    "language": "English",
    "quality": "Auto",
}

DEFAULT_USER_STATS = {
    "rated_movie_ids": [],
    "comment_count": 0,
}

GENRE_PATTERNS = [
    ("Action", re.compile(r"\baction\b", re.IGNORECASE)),
    ("Adventure", re.compile(r"\badventure\b", re.IGNORECASE)),
    ("Animation", re.compile(r"\banimation\b|\banimated\b", re.IGNORECASE)),
    ("Comedy", re.compile(r"\bcomedy\b|\bcomedic\b", re.IGNORECASE)),
    ("Crime", re.compile(r"\bcrime\b|\bcriminal\b", re.IGNORECASE)),
    ("Documentary", re.compile(r"\bdocumentary\b", re.IGNORECASE)),
    ("Drama", re.compile(r"\bdrama\b|\bdramatic\b", re.IGNORECASE)),
    ("Family", re.compile(r"\bfamily\b", re.IGNORECASE)),
    ("Fantasy", re.compile(r"\bfantasy\b", re.IGNORECASE)),
    ("History", re.compile(r"\bhistory\b|\bhistorical\b", re.IGNORECASE)),
    ("Horror", re.compile(r"\bhorror\b", re.IGNORECASE)),
    ("Music", re.compile(r"\bmusic\b|\bmusical\b", re.IGNORECASE)),
    ("Mystery", re.compile(r"\bmystery\b", re.IGNORECASE)),
    ("Romance", re.compile(r"\bromance\b|\bromantic\b", re.IGNORECASE)),
    ("Science Fiction", re.compile(r"\bscience fiction\b|\bsci[- ]?fi\b", re.IGNORECASE)),
    ("Thriller", re.compile(r"\bthriller\b", re.IGNORECASE)),
    ("TV Movie", re.compile(r"\btv movie\b|\btelevision film\b", re.IGNORECASE)),
    ("War", re.compile(r"\bwar\b", re.IGNORECASE)),
    ("Western", re.compile(r"\bwestern\b", re.IGNORECASE)),
]


# Pull recognizable genre labels out of noisy text.
def extract_genres(raw_value) -> list[str]:
    """Extract canonical genre labels from free-form or corrupted genre text."""
    if raw_value is None:
        return []

    if isinstance(raw_value, (list, tuple, set)):
        raw_text = ", ".join(str(part) for part in raw_value if part)
    else:
        raw_text = str(raw_value)

    raw_text = raw_text.strip()
    if not raw_text:
        return []

    matches = []
    for canonical, pattern in GENRE_PATTERNS:
        match = pattern.search(raw_text)
        if match:
            matches.append((match.start(), canonical))

    matches.sort(key=lambda item: item[0])

    seen = set()
    cleaned = []
    for _, canonical in matches:
        if canonical in seen:
            continue
        seen.add(canonical)
        cleaned.append(canonical)

    return cleaned[:4]


# Join cleaned genre labels into a single API-ready string.
def sanitize_genre_string(raw_value) -> str | None:
    """Return a clean comma-separated genre string or None when none can be trusted."""
    cleaned = extract_genres(raw_value)
    return ", ".join(cleaned) if cleaned else None


class Movie:
    """Represents a movie document in the 'movies' collection."""

    @staticmethod
    # Normalize a raw movie document before sending it to the client.
    def from_doc(doc: dict) -> dict:
        """Convert a MongoDB document to an API-friendly dictionary."""
        if not doc:
            return None

        # Compute display rating
        user_rating_count = doc.get("user_rating_count", 0) or 0
        user_rating_sum = doc.get("user_rating_sum", 0.0) or 0.0
        original_rating = doc.get("rating", 0.0)

        if user_rating_count > 0:
            display_rating = round(user_rating_sum / user_rating_count, 1)
        else:
            display_rating = original_rating

        poster_path = doc.get("poster_path")
        if poster_path and not poster_path.startswith("http"):
            poster_path = f"https://image.tmdb.org/t/p/w500{poster_path}"

        backdrop_path = doc.get("backdrop_path")
        if backdrop_path and not backdrop_path.startswith("http"):
            backdrop_path = f"https://image.tmdb.org/t/p/original{backdrop_path}"

        return {
            "id": doc.get("id"),
            "tmdb_id": doc.get("tmdb_id"),
            "title": doc.get("title"),
            "genre": sanitize_genre_string(doc.get("genre")),
            "franchise": doc.get("franchise"),
            "overview": doc.get("overview"),
            "rating": display_rating,
            "original_rating": original_rating,
            "user_rating_count": user_rating_count,
            "release_date": doc.get("release_date"),
            "poster_path": poster_path,
            "backdrop_path": backdrop_path,
            "popularity": doc.get("popularity", 0.0),
            "vote_count": doc.get("vote_count", 0),
            "monthly_score": doc.get("monthly_score", 0.0),
            # Wiki fields
            "wiki_summary": doc.get("wiki_summary"),
            "wiki_plot": doc.get("wiki_plot"),
            "wiki_cast": doc.get("wiki_cast"),
            "wiki_director": doc.get("wiki_director"),
            "wiki_budget": doc.get("wiki_budget"),
            "wiki_box_office": doc.get("wiki_box_office"),
            "wiki_runtime": doc.get("wiki_runtime"),
            "wiki_fetched": doc.get("wiki_fetched", False),
        }


class UserRating:
    """Represents a user rating document in the 'user_ratings' collection."""

    @staticmethod
    # Convert a rating document into a response-safe dictionary.
    def from_doc(doc: dict) -> dict:
        if not doc:
            return None
        return {
            "id": doc.get("id"),
            "user_id": doc.get("user_id", "anonymous"),
            "movie_id": doc.get("movie_id"),
            "rating": doc.get("rating"),
            "created_at": doc.get("created_at"),
        }


class Comment:
    """Represents a comment document in the 'comments' collection."""

    @staticmethod
    # Convert a comment document and format its timestamp for the API.
    def from_doc(doc: dict) -> dict:
        if not doc:
            return None
        created_at = doc.get("created_at")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        return {
            "id": doc.get("id"),
            "movie_id": doc.get("movie_id"),
            "user_name": doc.get("user_name", "Anonymous"),
            "content": doc.get("content"),
            "rating": doc.get("rating"),
            "created_at": created_at,
        }


class User:
    """Represents a user document in the 'users' collection."""

    @staticmethod
    # Merge saved settings with the app defaults.
    def settings_from_doc(doc: dict) -> dict:
        settings = DEFAULT_USER_SETTINGS.copy()
        settings.update(doc.get("settings") or {})
        return settings

    @staticmethod
    # Merge saved stats with the app defaults.
    def stats_from_doc(doc: dict) -> dict:
        stats = DEFAULT_USER_STATS.copy()
        stats.update(doc.get("stats") or {})
        return {
            "ratedMovieIds": [str(movie_id) for movie_id in stats.get("rated_movie_ids", [])],
            "commentCount": stats.get("comment_count", 0),
        }

    @staticmethod
    # Convert a user document into the frontend auth payload shape.
    def from_doc(doc: dict) -> dict:
        if not doc:
            return None

        created_at = doc.get("created_at")
        updated_at = doc.get("updated_at")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        if isinstance(updated_at, datetime):
            updated_at = updated_at.isoformat()

        return {
            "id": doc.get("id"),
            "name": doc.get("name"),
            "email": doc.get("email"),
            "avatar": doc.get("avatar"),
            "authProviders": doc.get("auth_providers", []),
            "created_at": created_at,
            "updated_at": updated_at,
        }
