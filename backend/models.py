"""
MongoDB document models for CineStream.
Plain Python classes that convert between MongoDB docs and API-friendly dicts.
"""

from datetime import datetime, timezone


class Movie:
    """Represents a movie document in the 'movies' collection."""

    @staticmethod
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
            "genre": doc.get("genre"),
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
