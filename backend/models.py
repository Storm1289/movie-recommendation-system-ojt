from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    genre = Column(String(255))
    overview = Column(Text)
    rating = Column(Float, default=0.0)
    release_date = Column(String(20))
    poster_path = Column(String(255))
    backdrop_path = Column(String(255))
    popularity = Column(Float, default=0.0)
    vote_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Extended info from Wikipedia (cached)
    wiki_summary = Column(Text, nullable=True)
    wiki_plot = Column(Text, nullable=True)
    wiki_cast = Column(Text, nullable=True)  # JSON string
    wiki_director = Column(String(255), nullable=True)
    wiki_budget = Column(String(100), nullable=True)
    wiki_box_office = Column(String(100), nullable=True)
    wiki_runtime = Column(String(50), nullable=True)
    wiki_fetched = Column(Boolean, default=False)

    # Aggregated user rating
    user_rating_sum = Column(Float, default=0.0)
    user_rating_count = Column(Integer, default=0)

    # NEW: Monthly ranking score
    monthly_score = Column(Float, default=0.0)

    def to_dict(self):
        # Compute display rating: if users have rated, use their average; else use original
        if self.user_rating_count and self.user_rating_count > 0:
            display_rating = round(self.user_rating_sum / self.user_rating_count, 1)
        else:
            display_rating = self.rating

        return {
            "id": self.id,
            "tmdb_id": self.tmdb_id,
            "title": self.title,
            "genre": self.genre,
            "overview": self.overview,
            "rating": display_rating,
            "original_rating": self.rating,
            "user_rating_count": self.user_rating_count or 0,
            "release_date": self.release_date,
            "poster_path": f"https://image.tmdb.org/t/p/w500{self.poster_path}" if self.poster_path and not self.poster_path.startswith("http") else self.poster_path,
            "backdrop_path": f"https://image.tmdb.org/t/p/original{self.backdrop_path}" if self.backdrop_path and not self.backdrop_path.startswith("http") else self.backdrop_path,
            "popularity": self.popularity,
            "vote_count": self.vote_count,
            "monthly_score": self.monthly_score,
            # Wiki fields
            "wiki_summary": self.wiki_summary,
            "wiki_plot": self.wiki_plot,
            "wiki_cast": self.wiki_cast,
            "wiki_director": self.wiki_director,
            "wiki_budget": self.wiki_budget,
            "wiki_box_office": self.wiki_box_office,
            "wiki_runtime": self.wiki_runtime,
            "wiki_fetched": self.wiki_fetched or False,
        }


class UserRating(Base):
    __tablename__ = "user_ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), default="anonymous")
    movie_id = Column(Integer, index=True)
    rating = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, index=True, nullable=False)
    user_name = Column(String(100), default="Anonymous")
    user_email = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    rating = Column(Float, nullable=True)  # Rating attached to comment (1-10)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "movie_id": self.movie_id,
            "user_name": self.user_name,
            "content": self.content,
            "rating": self.rating,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
