from datetime import datetime
from database import SessionLocal
from models import Movie

def calculate_score(movie: Movie) -> float:
    """
    Final Score = (0.4 × rating) + (0.3 × popularity) + (0.2 × recent_release_boost) + (0.1 × vote_count)
    """
    # 1. Average Rating (0 - 10 scale)
    base_rating = movie.rating
    if movie.user_rating_count and movie.user_rating_count > 0:
        # Blend IMDb rating and user rating
        base_rating = (movie.rating + (movie.user_rating_sum / movie.user_rating_count)) / 2.0
    
    # 2. Popularity Score (Normalize 0 - 10 max)
    pop_score = min(movie.popularity / 100.0, 10.0)
    
    # 3. Recent Release Boost
    recent_boost = 0.0
    if movie.release_date:
        try:
            # Expected format: YYYY-MM-DD
            release_dt = datetime.strptime(movie.release_date[:10], "%Y-%m-%d")
            now = datetime.now()
            days_old = (now - release_dt).days
            
            if days_old <= 30:
                recent_boost = 10.0
            elif days_old <= 90:
                recent_boost = 8.0
            elif days_old <= 180:
                recent_boost = 5.0
            elif days_old <= 365 * 2: # Within 2 years
                recent_boost = 2.0
        except ValueError:
            pass # Invalid date format
            
    # 4. Trending Factor (Votes)
    total_votes = movie.vote_count + (movie.user_rating_count or 0)
    vote_factor = min(total_votes / 500.0, 10.0)  # Max out around 5000 votes
    
    # Final Weighted Calculation
    # Note: Using weights as proportions of maximum 10-point scales
    final_score = (0.4 * base_rating) + (0.3 * pop_score) + (0.2 * recent_boost) + (0.1 * vote_factor)
    return round(final_score, 3)


def recalculate_all_scores():
    """Recalculates the monthly_score for all movies in the database."""
    db = SessionLocal()
    try:
        movies = db.query(Movie).all()
        for movie in movies:
            movie.monthly_score = calculate_score(movie)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error recalculating scores: {e}")
    finally:
        db.close()


def update_movie_score(movie_id: int):
    """Recalculates the score for a single movie (e.g. after a user rating is added)"""
    db = SessionLocal()
    try:
        movie = db.query(Movie).filter(Movie.id == movie_id).first()
        if movie:
            movie.monthly_score = calculate_score(movie)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error updating movie score: {e}")
    finally:
        db.close()
