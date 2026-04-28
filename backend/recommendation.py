"""
Movie recommendation engine.

Runtime inference uses small precomputed JSON files so Vercel does not need
heavy ML packages such as pandas, scikit-learn, numpy, or scipy.
"""

import json
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "pickles"
RECOMMENDATIONS_JSON = MODEL_DIR / "recommendations.json"
MOVIES_JSON = MODEL_DIR / "movies_list.json"

_recommendations_cache = None
_movies_cache = None


def ensure_pickle_dir():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _clean_movie_record(record: dict) -> dict:
    allowed_fields = [
        "id",
        "title",
        "genre",
        "overview",
        "rating",
        "release_date",
        "poster_path",
        "backdrop_path",
        "popularity",
    ]
    cleaned = {}
    for field in allowed_fields:
        value = record.get(field)
        if hasattr(value, "item"):
            value = value.item()
        cleaned[field] = value
    if cleaned.get("id") is not None:
        cleaned["id"] = int(cleaned["id"])
    return cleaned


def build_recommendation_model(movies_data: list[dict]):
    """
    Build TF-IDF recommendations offline and save lightweight JSON artifacts.

    Install backend/requirements-model.txt before running this locally.
    """
    # Keep these imports local so the Vercel runtime never needs ML packages.
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    ensure_pickle_dir()

    df = pd.DataFrame(movies_data)
    if df.empty:
        RECOMMENDATIONS_JSON.write_text("{}", encoding="utf-8")
        MOVIES_JSON.write_text("[]", encoding="utf-8")
        return {}, []

    director = df["wiki_director"] if "wiki_director" in df else pd.Series("", index=df.index)
    df["combined"] = (
        df["overview"].fillna("")
        + " "
        + df["genre"].fillna("")
        + " "
        + df["genre"].fillna("")
        + " "
        + director.fillna("")
        + " "
        + director.fillna("")
    )

    tfidf = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df["combined"])
    similarity = cosine_similarity(tfidf_matrix)

    movies_dict_list = [_clean_movie_record(record) for record in df.to_dict("records")]
    recommendations_map = {}

    for idx, row in df.iterrows():
        movie_id = int(row["id"])
        scores = list(enumerate(similarity[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)
        top_scores = scores[1:16]
        movie_indices = [int(score[0]) for score in top_scores]
        recommendations_map[str(movie_id)] = [movies_dict_list[i] for i in movie_indices]

    RECOMMENDATIONS_JSON.write_text(
        json.dumps(recommendations_map, separators=(",", ":")),
        encoding="utf-8",
    )
    MOVIES_JSON.write_text(
        json.dumps(movies_dict_list, separators=(",", ":")),
        encoding="utf-8",
    )

    global _recommendations_cache, _movies_cache
    _recommendations_cache = recommendations_map
    _movies_cache = movies_dict_list

    print(f"Vercel-optimized recommendation model saved ({len(df)} movies)")
    return recommendations_map, movies_dict_list


def load_model(force_reload: bool = False):
    """Load precomputed recommendation JSON, cached per serverless instance."""
    global _recommendations_cache, _movies_cache

    if not force_reload and _recommendations_cache is not None and _movies_cache is not None:
        return _recommendations_cache, _movies_cache

    if not RECOMMENDATIONS_JSON.exists() or not MOVIES_JSON.exists():
        return None, None

    with RECOMMENDATIONS_JSON.open("r", encoding="utf-8") as f:
        _recommendations_cache = json.load(f)

    with MOVIES_JSON.open("r", encoding="utf-8") as f:
        _movies_cache = json.load(f)

    return _recommendations_cache, _movies_cache


def get_recommendations(movie_id: int, top_n: int = 10):
    recommendations_map, _ = load_model()
    if not recommendations_map:
        return []

    recs = recommendations_map.get(str(movie_id), [])
    return recs[:top_n]


def search_similar_by_text(query: str, top_n: int = 10):
    _, movies_list = load_model()
    if not movies_list:
        return []

    normalized_query = query.lower()
    matches = [
        movie
        for movie in movies_list
        if normalized_query in str(movie.get("title", "")).lower()
    ]
    return matches[:top_n]
