from datetime import datetime
from database import get_db


def calculate_score(movie_doc: dict) -> float:
    """
    Final Score = (0.4 × rating) + (0.3 × popularity) + (0.2 × recent_release_boost) + (0.1 × vote_count)
    """
    # 1. Average Rating (0 - 10 scale)
    base_rating = movie_doc.get("rating", 0.0)
    user_rating_count = movie_doc.get("user_rating_count", 0) or 0
    user_rating_sum = movie_doc.get("user_rating_sum", 0.0) or 0.0

    if user_rating_count > 0:
        # Blend IMDb rating and user rating
        base_rating = (base_rating + (user_rating_sum / user_rating_count)) / 2.0

    # 2. Popularity Score (Normalize 0 - 10 max)
    pop_score = min(movie_doc.get("popularity", 0.0) / 100.0, 10.0)

    # 3. Recent Release Boost
    recent_boost = 0.0
    release_date = movie_doc.get("release_date")
    if release_date:
        try:
            release_dt = datetime.strptime(release_date[:10], "%Y-%m-%d")
            now = datetime.now()
            days_old = (now - release_dt).days

            if days_old <= 30:
                recent_boost = 10.0
            elif days_old <= 90:
                recent_boost = 8.0
            elif days_old <= 180:
                recent_boost = 5.0
            elif days_old <= 365 * 2:  # Within 2 years
                recent_boost = 2.0
        except ValueError:
            pass  # Invalid date format

    # 4. Trending Factor (Votes)
    total_votes = movie_doc.get("vote_count", 0) + user_rating_count
    vote_factor = min(total_votes / 500.0, 10.0)  # Max out around 5000 votes

    # Final Weighted Calculation
    final_score = (0.4 * base_rating) + (0.3 * pop_score) + (0.2 * recent_boost) + (0.1 * vote_factor)
    return round(final_score, 3)


def recalculate_all_scores():
    """Recalculates the monthly_score for all movies in the database."""
    db = get_db()
    try:
        movies = list(db.movies.find())
        for movie_doc in movies:
            score = calculate_score(movie_doc)
            db.movies.update_one(
                {"id": movie_doc["id"]},
                {"$set": {"monthly_score": score}}
            )
    except Exception as e:
        print(f"Error recalculating scores: {e}")


def update_movie_score(movie_id: int):
    """Recalculates the score for a single movie (e.g. after a user rating is added)"""
    db = get_db()
    try:
        movie_doc = db.movies.find_one({"id": movie_id})
        if movie_doc:
            score = calculate_score(movie_doc)
            db.movies.update_one(
                {"id": movie_id},
                {"$set": {"monthly_score": score}}
            )
    except Exception as e:
        print(f"Error updating movie score: {e}")
