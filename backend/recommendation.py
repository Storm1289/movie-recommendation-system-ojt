"""
Movie Recommendation Engine using TF-IDF + Cosine Similarity.
Uses pickle to save/load the precomputed similarity matrix.
"""

import os
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PICKLE_DIR = os.path.join(os.path.dirname(__file__), "pickles")
SIMILARITY_PICKLE = os.path.join(PICKLE_DIR, "similarity_matrix.pkl")
MOVIES_PICKLE = os.path.join(PICKLE_DIR, "movies_df.pkl")


# Create the pickle directory before saving model artifacts.
def ensure_pickle_dir():
    os.makedirs(PICKLE_DIR, exist_ok=True)

# Global caches for the model to prevent slow disk I/O on every request
_similarity_cache = None
_df_cache = None

# Build and persist the TF-IDF(Term Frequency – Inverse Document Frequency) recommendation model from movie data.
def build_recommendation_model(movies_data: list[dict]):
    """
    Build TF-IDF similarity matrix from movie data and save with pickle.

    Args:
        movies_data: list of movie dicts with 'id', 'title', 'genre', 'overview'
    """
    ensure_pickle_dir()

    df = pd.DataFrame(movies_data)
    # Give weight to genre and director by duplicating them
    df["combined"] = df["overview"].fillna("") + " " + df["genre"].fillna("") + " " + df["genre"].fillna("") + " " + df.get("wiki_director", pd.Series(dtype=str)).fillna("") + " " + df.get("wiki_director", pd.Series(dtype=str)).fillna("")

    tfidf = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df["combined"])

    similarity = cosine_similarity(tfidf_matrix)

    # Save with pickle
    with open(SIMILARITY_PICKLE, "wb") as f:
        pickle.dump(similarity, f)

    with open(MOVIES_PICKLE, "wb") as f:
        pickle.dump(df, f)

    # Update in-memory cache
    global _similarity_cache, _df_cache
    _similarity_cache = similarity
    _df_cache = df

    print(f"✅ Recommendation model built and pickled ({len(df)} movies)")
    return similarity, df


# Load the saved similarity matrix and movie dataframe from disk.
def load_model():
    """Load the precomputed similarity matrix and movies dataframe from pickle."""
    global _similarity_cache, _df_cache
    
    if _similarity_cache is not None and _df_cache is not None:
        return _similarity_cache, _df_cache

    if not os.path.exists(SIMILARITY_PICKLE) or not os.path.exists(MOVIES_PICKLE):
        return None, None

    with open(SIMILARITY_PICKLE, "rb") as f:
        _similarity_cache = pickle.load(f)

    with open(MOVIES_PICKLE, "rb") as f:
        _df_cache = pickle.load(f)

    print(f"✅ Loaded pickled model ({len(_df_cache)} movies) into memory")
    return _similarity_cache, _df_cache


# Return the closest movies for a given movie id.
def get_recommendations(movie_id: int, top_n: int = 10):
    """
    Get top N recommended movies similar to the given movie.

    Returns list of movie dicts or empty list if model not ready.
    """
    similarity, df = load_model()
    if similarity is None or df is None:
        return []

    # Find the movie by id
    matches = df[df["id"] == movie_id]
    if matches.empty:
        return []

    idx = matches.index[0]
    scores = list(enumerate(similarity[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    # Skip the first one (itself) and get top_n
    top_scores = scores[1 : top_n + 1]
    movie_indices = [i[0] for i in top_scores]

    results = df.iloc[movie_indices][["id", "title", "genre", "overview", "rating", "release_date", "poster_path", "backdrop_path", "popularity"]].to_dict("records")
    return results


# Run a lightweight title search against the pickled movie dataframe.
def search_similar_by_text(query: str, top_n: int = 10):
    """
    Search for movies by text query using the TF-IDF model.
    """
    similarity, df = load_model()
    if similarity is None or df is None:
        return []

    # Simple substring search on title
    matches = df[df["title"].str.contains(query, case=False, na=False)]
    if matches.empty:
        return []

    return matches.head(top_n)[["id", "title", "genre", "overview", "rating", "release_date", "poster_path", "backdrop_path", "popularity"]].to_dict("records")
