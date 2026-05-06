from models.entities import Movie
from services.movie_service import trending_movie_docs, split_movie_genres, extract_movie_keywords, normalized_popularity

def build_user_recommendations(user_doc: dict, top_n: int, db) -> dict:
    """Build personalized movie recommendations from watchlist, ratings, and reviews."""
    watchlist_ids = user_doc.get("watchlist_ids") or []
    excluded_ids = set(watchlist_ids)
    seed_weights: dict[int, float] = {}

    for movie_id in watchlist_ids:
        seed_weights[movie_id] = max(seed_weights.get(movie_id, 0.0), 1.0)

    user_id = user_doc.get("id")
    if user_id is not None:
        for rating_doc in db.user_ratings.find({"user_id": str(user_id)}):
            movie_id = rating_doc.get("movie_id")
            rating_value = float(rating_doc.get("rating") or 0.0)
            if movie_id is None or rating_value <= 0:
                continue
            excluded_ids.add(movie_id)
            seed_weights[movie_id] = max(seed_weights.get(movie_id, 0.0), 1.0 + (rating_value / 10.0))

    user_email = user_doc.get("email")
    if user_email:
        for comment_doc in db.comments.find({"user_email": user_email}):
            movie_id = comment_doc.get("movie_id")
            rating_value = comment_doc.get("rating")
            if movie_id is None:
                continue
            excluded_ids.add(movie_id)
            weight = 1.1
            if rating_value is not None:
                weight += float(rating_value) / 10.0
            seed_weights[movie_id] = max(seed_weights.get(movie_id, 0.0), weight)

    if not seed_weights:
        movies = trending_movie_docs(db, top_n)
        return {
            "title": "Trending now",
            "message": None,
            "reason": None,
            "source": "trending",
            "recommendations": [Movie.from_doc(movie) for movie in movies],
        }

    seed_movie_ids = list(seed_weights.keys())
    seed_movies = list(db.movies.find({"id": {"$in": seed_movie_ids}}))
    if not seed_movies:
        movies = trending_movie_docs(db, top_n)
        return {
            "title": "Trending now",
            "message": None,
            "reason": None,
            "source": "trending",
            "recommendations": [Movie.from_doc(movie) for movie in movies],
        }

    genre_counts: dict[str, int] = {}
    keyword_counts: dict[str, int] = {}
    for movie in seed_movies:
        movie_weight = seed_weights.get(movie["id"], 1.0)
        for genre in split_movie_genres(movie):
            genre_counts[genre] = genre_counts.get(genre, 0) + movie_weight
        for keyword in extract_movie_keywords(movie):
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + movie_weight

    max_popularity_doc = db.movies.find_one(sort=[("popularity", -1)])
    max_popularity = float((max_popularity_doc or {}).get("popularity", 0.0) or 0.0)
    candidate_pool = list(
        db.movies.find({"id": {"$nin": list(excluded_ids)}, "poster_path": {"$ne": None}})
        .sort("popularity", -1)
        .limit(400)
    )

    scored_movies = []
    max_genre_weight = max(sum(genre_counts.values()), 1)
    top_keywords = dict(sorted(keyword_counts.items(), key=lambda item: item[1], reverse=True)[:50])
    max_keyword_weight = max(sum(top_keywords.values()), 1)

    for movie in candidate_pool:
        movie_genres = split_movie_genres(movie)
        movie_keywords = extract_movie_keywords(movie)
        genre_score = sum(genre_counts.get(genre, 0) for genre in movie_genres) / max_genre_weight
        keyword_score = sum(top_keywords.get(keyword, 0) for keyword in movie_keywords) / max_keyword_weight
        popularity_score = normalized_popularity(movie, max_popularity)
        score = (genre_score * 0.6) + (keyword_score * 0.3) + (popularity_score * 0.1)

        if score > 0:
            scored_movies.append((score, tuple(sorted(movie_genres)), movie))

    scored_movies.sort(key=lambda item: item[0], reverse=True)

    selected = []
    seen_genre_groups = set()
    for _, genre_group, movie in scored_movies:
        if len(selected) >= top_n:
            break
        if len(seed_movies) > 1 and genre_group in seen_genre_groups and len(selected) < max(3, top_n // 2):
            continue
        selected.append(movie)
        seen_genre_groups.add(genre_group)

    if len(selected) < top_n:
        selected_ids = {movie["id"] for movie in selected} | excluded_ids
        selected.extend(trending_movie_docs(db, top_n - len(selected), selected_ids))

    top_genre = None
    if genre_counts:
        top_genre_item = max(genre_counts.items(), key=lambda item: item[1])
        top_genre = top_genre_item[0].title()
    reason_movie = seed_movies[-1].get("title") if seed_movies else None
    reason = top_genre or reason_movie
    source = "watchlist" if watchlist_ids else "activity"
    if watchlist_ids:
        message = f"Because you saved {reason}" if reason else "Because of your watchlist"
    else:
        message = f"Because you reacted strongly to {reason}" if reason else "Because of your ratings and reviews"

    return {
        "title": "Recommended for you",
        "message": message,
        "reason": reason,
        "source": source,
        "recommendations": [Movie.from_doc(movie) for movie in selected[:top_n]],
    }
