import os
import json
import threading
import re
import hashlib
import secrets
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Depends, Query, Request, HTTPException

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
except ModuleNotFoundError:
    google_requests = None
    google_id_token = None

from pymongo.errors import DuplicateKeyError

from database import get_db, get_next_id
from models import (
    Movie,
    Comment,
    User,
    DEFAULT_USER_SETTINGS,
    DEFAULT_USER_STATS,
    sanitize_genre_string,
)
from recommendation import load_model, get_recommendations
from ranking import recalculate_all_scores, update_movie_score

IS_VERCEL = bool(os.environ.get("VERCEL"))

app = FastAPI(title="CineStream API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Make sure a collection keeps the expected unique index definition.
def ensure_unique_index(collection, keys, name: str):
    expected_key = dict(keys)
    existing_indexes = list(collection.list_indexes())

    for index in existing_indexes:
        if dict(index.get("key", {})) != expected_key:
            continue

        if index.get("unique") is True:
            if index.get("name") != name:
                collection.drop_index(index["name"])
                collection.create_index(keys, name=name, unique=True)
            return

        collection.drop_index(index["name"])
        break

    collection.create_index(keys, name=name, unique=True)


# Make sure a sparse unique index exists for optional auth fields.
def ensure_unique_sparse_index(collection, key: str, name: str):
    expected_key = {key: 1}
    existing_indexes = list(collection.list_indexes())

    for index in existing_indexes:
        if dict(index.get("key", {})) != expected_key:
            continue

        if index.get("unique") is True and index.get("sparse") is True:
            if index.get("name") != name:
                collection.drop_index(index["name"])
                collection.create_index([(key, 1)], name=name, unique=True, sparse=True)
            return

        collection.drop_index(index["name"])
        break

    collection.create_index([(key, 1)], name=name, unique=True, sparse=True)


# ─── LOAD RECOMMENDATION MODEL ─────────────────────
model_loaded = False

@app.on_event("startup")
# Load cached models, repair indexes, and kick off ranking refresh.
def startup():
    global model_loaded
    similarity, df = load_model()
    db = get_db()
    ensure_unique_index(db.users, [("email", 1)], "users_email_unique")
    ensure_unique_sparse_index(db.users, "google_sub", "users_google_sub_unique")
    ensure_unique_sparse_index(db.users, "facebook_user_id", "users_facebook_user_id_unique")
    ensure_unique_index(
        db.user_ratings,
        [("movie_id", 1), ("user_id", 1)],
        "user_ratings_movie_user_unique",
    )

    if similarity is not None and df is not None:
        model_loaded = True
        print(f"✅ Model loaded on startup ({len(df)} movies)")
    else:
        print("⚠️ No pickled model found — run seed.py first")

    if IS_VERCEL:
        print("⏭️ Skipping startup ranking recalculation on Vercel serverless runtime.")
        return

    # Avoid expensive background work during serverless cold starts.
    threading.Thread(target=recalculate_all_scores, daemon=True).start()
    print("📈 Triggered background calculation of Dynamic Monthly Top 10 Scores.")


# ─── PYDANTIC SCHEMAS ──────────────────────────────

class CommentCreate(BaseModel):
    user_id: Optional[int] = None
    user_name: str = "Anonymous"
    user_email: Optional[str] = None
    content: str
    rating: Optional[float] = None  # 1-10

class RatingCreate(BaseModel):
    user_id: str = "anonymous"
    rating: float  # 1-10


class SignupCreate(BaseModel):
    name: str
    email: str
    password: str


class LoginCreate(BaseModel):
    email: str
    password: str


class GoogleAuthCreate(BaseModel):
    credential: str


class FacebookAuthCreate(BaseModel):
    access_token: str


class SettingsUpdate(BaseModel):
    darkMode: Optional[bool] = None
    autoplay: Optional[bool] = None
    notifications: Optional[bool] = None
    emailDigest: Optional[bool] = None
    language: Optional[str] = None
    quality: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: str


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


# Normalize emails so auth lookups stay consistent.
def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


# Hash a password with PBKDF2 and return its salt plus digest.
def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    ).hex()
    return salt, password_hash


# Compare a plaintext password against the stored user hash.
def verify_password(password: str, user_doc: dict) -> bool:
    salt = user_doc.get("password_salt")
    expected_hash = user_doc.get("password_hash")
    if not salt or not expected_hash:
        return False
    _, password_hash = hash_password(password, salt)
    return password_hash == expected_hash


# Build a simple fallback avatar from the user's name or email.
def make_avatar(name: str, email: str) -> str:
    source = (name or "").strip() or normalize_email(email)
    return source[:1].upper() if source else "C"


# Read a required environment variable or fail with a clear API error.
def get_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    raise HTTPException(status_code=503, detail=f"{name} is not configured on the server")


# Add a social provider once without duplicating existing entries.
def merge_auth_providers(existing_providers: Optional[list], provider: str) -> list[str]:
    providers = [p for p in (existing_providers or []) if p]
    if provider not in providers:
        providers.append(provider)
    return providers


# Map a provider name to the matching MongoDB field.
def provider_field_name(provider: str) -> str:
    if provider == "google":
        return "google_sub"
    if provider == "facebook":
        return "facebook_user_id"
    raise HTTPException(status_code=400, detail="Unsupported authentication provider")


# Verify a Google token and normalize the returned profile payload.
def verify_google_credential(credential: str) -> dict:
    client_id = get_required_env("GOOGLE_CLIENT_ID")

    # If it's a JWT (contains dots), try ID token verification
    if credential.count(".") == 2:
        if google_requests is None or google_id_token is None:
            raise HTTPException(
                status_code=503,
                detail="Google ID token verification is unavailable because google-auth is not installed on the server",
            )
        try:
            token_info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
            issuer = token_info.get("iss")
            if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
                raise HTTPException(status_code=401, detail="Invalid Google token issuer")

            if not token_info.get("email_verified"):
                raise HTTPException(status_code=400, detail="Google account email is not verified")

            return {
                "provider": "google",
                "provider_user_id": token_info.get("sub"),
                "email": token_info.get("email"),
                "name": token_info.get("name"),
                "avatar": token_info.get("picture"),
            }
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid Google sign-in id_token") from exc
    else:
        # Otherwise, treat it as an OAuth access token and fetch userinfo
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {credential}"},
                timeout=10,
            )
            resp.raise_for_status()
            userinfo = resp.json()
        except requests.RequestException as exc:
            raise HTTPException(status_code=401, detail="Invalid Google sign-in access_token") from exc

        if not userinfo.get("email_verified"):
            raise HTTPException(status_code=400, detail="Google account email is not verified")

        return {
            "provider": "google",
            "provider_user_id": userinfo.get("sub"),
            "email": userinfo.get("email"),
            "name": userinfo.get("name"),
            "avatar": userinfo.get("picture"),
        }


# Verify a Facebook access token and fetch the user's profile data.
def verify_facebook_access_token(access_token: str) -> dict:
    app_id = get_required_env("FACEBOOK_APP_ID")
    app_secret = get_required_env("FACEBOOK_APP_SECRET")

    try:
        debug_response = requests.get(
            "https://graph.facebook.com/debug_token",
            params={
                "input_token": access_token,
                "access_token": f"{app_id}|{app_secret}",
            },
            timeout=10,
        )
        debug_response.raise_for_status()
        debug_data = (debug_response.json() or {}).get("data") or {}
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Unable to verify Facebook sign-in") from exc

    if not debug_data.get("is_valid"):
        raise HTTPException(status_code=401, detail="Invalid Facebook sign-in token")

    if str(debug_data.get("app_id")) != app_id:
        raise HTTPException(status_code=401, detail="Facebook token does not belong to this app")

    try:
        profile_response = requests.get(
            "https://graph.facebook.com/me",
            params={
                "fields": "id,name,email,picture.type(large)",
                "access_token": access_token,
            },
            timeout=10,
        )
        profile_response.raise_for_status()
        profile = profile_response.json() or {}
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Unable to fetch Facebook profile") from exc

    email = normalize_email(profile.get("email"))
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Facebook did not return an email address. Make sure email access is approved for your app and the account has an email.",
        )

    picture_data = (profile.get("picture") or {}).get("data") or {}
    return {
        "provider": "facebook",
        "provider_user_id": profile.get("id"),
        "email": email,
        "name": profile.get("name"),
        "avatar": picture_data.get("url"),
    }


# Create or update a user record for Google or Facebook sign-in.
def upsert_social_user(
    db,
    *,
    provider: str,
    provider_user_id: str,
    email: str,
    name: str,
    avatar: Optional[str] = None,
) -> dict:
    normalized_email = normalize_email(email)
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email is required for social sign-in")
    if not provider_user_id:
        raise HTTPException(status_code=400, detail="Provider user ID is missing")

    provider_field = provider_field_name(provider)
    provider_user = db.users.find_one({provider_field: provider_user_id})
    email_user = db.users.find_one({"email": normalized_email})

    if provider_user and email_user and provider_user.get("id") != email_user.get("id"):
        raise HTTPException(
            status_code=409,
            detail="This social account is already linked to another user",
        )

    user_doc = provider_user or email_user
    now = datetime.now(timezone.utc)
    display_name = (name or "").strip() or (user_doc or {}).get("name") or normalized_email.split("@")[0]
    avatar_value = avatar or (user_doc or {}).get("avatar") or make_avatar(display_name, normalized_email)

    if user_doc:
        email_owner = db.users.find_one({"email": normalized_email})
        if email_owner and email_owner.get("id") != user_doc.get("id"):
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        db.users.update_one(
            {"id": user_doc["id"]},
            {
                "$set": {
                    "name": display_name,
                    "email": normalized_email,
                    "avatar": avatar_value,
                    provider_field: provider_user_id,
                    "auth_providers": merge_auth_providers(user_doc.get("auth_providers"), provider),
                    "updated_at": now,
                }
            },
        )
        return db.users.find_one({"id": user_doc["id"]})

    new_user = {
        "id": get_next_id("users"),
        "name": display_name,
        "email": normalized_email,
        "avatar": avatar_value,
        "auth_providers": [provider],
        provider_field: provider_user_id,
        "watchlist_ids": [],
        "settings": DEFAULT_USER_SETTINGS.copy(),
        "stats": DEFAULT_USER_STATS.copy(),
        "created_at": now,
        "updated_at": now,
    }

    try:
        db.users.insert_one(new_user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    return new_user


# Build the full frontend auth state from a stored user document.
def build_user_state(user_doc: dict, db) -> dict:
    watchlist_ids = user_doc.get("watchlist_ids") or []
    watchlist_movies = []

    if watchlist_ids:
        movies = list(db.movies.find({"id": {"$in": watchlist_ids}}))
        movies_by_id = {movie["id"]: movie for movie in movies}
        watchlist_movies = [
            Movie.from_doc(movies_by_id[movie_id])
            for movie_id in watchlist_ids
            if movie_id in movies_by_id
        ]

    return {
        "user": User.from_doc(user_doc),
        "watchlist": watchlist_movies,
        "settings": User.settings_from_doc(user_doc),
        "stats": User.stats_from_doc(user_doc),
    }


# Fetch a user or raise a standard 404 API error.
def get_user_or_404(user_id: int, db) -> dict:
    user_doc = db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc


# Ensure password operations only run for local auth accounts.
def ensure_local_password_auth(user_doc: dict):
    if user_doc.get("password_hash") and user_doc.get("password_salt"):
        return

    raise HTTPException(
        status_code=400,
        detail="Password changes are only available for accounts created with email and password.",
    )


# ─── USER ENDPOINTS ────────────────────────────────

@app.post("/api/auth/signup")
# Register a new local user and return their initial app state.
def signup(payload: SignupCreate, db=Depends(get_db)):
    name = payload.name.strip()
    email = normalize_email(payload.email)
    password = payload.password.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    salt, password_hash = hash_password(password)
    now = datetime.now(timezone.utc)
    new_user = {
        "id": get_next_id("users"),
        "name": name,
        "email": email,
        "avatar": make_avatar(name, email),
        "auth_providers": ["local"],
        "password_salt": salt,
        "password_hash": password_hash,
        "watchlist_ids": [],
        "settings": DEFAULT_USER_SETTINGS.copy(),
        "stats": DEFAULT_USER_STATS.copy(),
        "created_at": now,
        "updated_at": now,
    }

    try:
        db.users.insert_one(new_user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    return build_user_state(new_user, db)


@app.post("/api/auth/login")
# Authenticate an email/password user and return their app state.
def login(payload: LoginCreate, db=Depends(get_db)):
    email = normalize_email(payload.email)
    user_doc = db.users.find_one({"email": email})

    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user_doc.get("password_hash") or not user_doc.get("password_salt"):
        raise HTTPException(
            status_code=400,
            detail="This account uses social sign-in. Continue with Google or Facebook instead.",
        )

    if not verify_password(payload.password, user_doc):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return build_user_state(user_doc, db)


@app.post("/api/auth/google")
# Sign in with Google and upsert the linked user account.
def google_login(payload: GoogleAuthCreate, db=Depends(get_db)):
    profile = verify_google_credential(payload.credential)
    user_doc = upsert_social_user(
        db,
        provider=profile["provider"],
        provider_user_id=profile["provider_user_id"],
        email=profile["email"],
        name=profile.get("name"),
        avatar=profile.get("avatar"),
    )
    return build_user_state(user_doc, db)


@app.post("/api/auth/facebook")
# Sign in with Facebook and upsert the linked user account.
def facebook_login(payload: FacebookAuthCreate, db=Depends(get_db)):
    profile = verify_facebook_access_token(payload.access_token)
    user_doc = upsert_social_user(
        db,
        provider=profile["provider"],
        provider_user_id=profile["provider_user_id"],
        email=profile["email"],
        name=profile.get("name"),
        avatar=profile.get("avatar"),
    )
    return build_user_state(user_doc, db)


@app.get("/api/users/{user_id}/state")
# Return the combined user, watchlist, settings, and stats payload.
def get_user_state(user_id: int, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    return build_user_state(user_doc, db)


@app.put("/api/users/{user_id}/settings")
# Update persisted user settings without overwriting missing fields.
def update_user_settings(user_id: int, payload: SettingsUpdate, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    next_settings = User.settings_from_doc(user_doc)
    updates = payload.dict(exclude_none=True)
    next_settings.update(updates)

    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "settings": next_settings,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    refreshed_user = db.users.find_one({"id": user_id})
    return {
        "settings": User.settings_from_doc(refreshed_user),
        "stats": User.stats_from_doc(refreshed_user),
    }


@app.put("/api/users/{user_id}/profile")
# Update the public profile fields for a user.
def update_user_profile(user_id: int, payload: ProfileUpdate, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    name = (payload.name or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Display name is required")

    updated_fields = {
        "name": name,
        "updated_at": datetime.now(timezone.utc),
    }

    avatar = user_doc.get("avatar")
    if not avatar or (isinstance(avatar, str) and not avatar.startswith("http")):
        updated_fields["avatar"] = make_avatar(name, user_doc.get("email", ""))

    db.users.update_one({"id": user_id}, {"$set": updated_fields})

    refreshed_user = db.users.find_one({"id": user_id})
    return build_user_state(refreshed_user, db)


@app.put("/api/users/{user_id}/password")
# Change the password for a locally authenticated account.
def update_user_password(user_id: int, payload: PasswordUpdate, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    ensure_local_password_auth(user_doc)

    current_password = (payload.current_password or "").strip()
    new_password = (payload.new_password or "").strip()

    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    if not verify_password(current_password, user_doc):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    salt, password_hash = hash_password(new_password)
    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "password_salt": salt,
                "password_hash": password_hash,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Password updated successfully"}


@app.delete("/api/users/{user_id}")
# Delete a user account and roll back its rating contributions.
def delete_user_account(user_id: int, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    user_email = normalize_email(user_doc.get("email"))
    user_id_str = str(user_id)

    comments = list(db.comments.find({"user_email": user_email})) if user_email else []
    ratings = list(db.user_ratings.find({"user_id": user_id_str}))

    movie_adjustments: dict[int, dict[str, float | int]] = {}

    # Track how much rating data should be removed from each movie.
    def accumulate_adjustment(movie_id, rating_value):
        if movie_id is None or rating_value is None:
            return
        bucket = movie_adjustments.setdefault(movie_id, {"sum": 0.0, "count": 0})
        bucket["sum"] += float(rating_value)
        bucket["count"] += 1

    for comment in comments:
        rating_value = comment.get("rating")
        if rating_value is not None:
            accumulate_adjustment(comment.get("movie_id"), rating_value)

    for rating in ratings:
        accumulate_adjustment(rating.get("movie_id"), rating.get("rating"))

    if user_email:
        db.comments.delete_many({"user_email": user_email})
    db.user_ratings.delete_many({"user_id": user_id_str})
    db.users.delete_one({"id": user_id})

    for movie_id, adjustment in movie_adjustments.items():
        db.movies.update_one(
            {"id": movie_id},
            {
                "$inc": {
                    "user_rating_sum": -adjustment["sum"],
                    "user_rating_count": -adjustment["count"],
                }
            },
        )

        updated_movie = db.movies.find_one({"id": movie_id})
        if not updated_movie:
            continue

        safe_sum = max(float(updated_movie.get("user_rating_sum", 0.0) or 0.0), 0.0)
        safe_count = max(int(updated_movie.get("user_rating_count", 0) or 0), 0)
        if safe_sum != updated_movie.get("user_rating_sum") or safe_count != updated_movie.get("user_rating_count"):
            db.movies.update_one(
                {"id": movie_id},
                {"$set": {"user_rating_sum": safe_sum, "user_rating_count": safe_count}},
            )

        threading.Thread(target=update_movie_score, args=(movie_id,), daemon=True).start()

    return {"message": "Account deleted successfully"}


@app.post("/api/users/{user_id}/watchlist/{movie_id}")
# Add a movie to the user's watchlist if it is not already saved.
def add_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
    user_doc = get_user_or_404(user_id, db)
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    watchlist_ids = user_doc.get("watchlist_ids") or []
    if movie["id"] not in watchlist_ids:
        watchlist_ids.append(movie["id"])
        db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "watchlist_ids": watchlist_ids,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    refreshed_user = db.users.find_one({"id": user_id})
    return {"watchlist": build_user_state(refreshed_user, db)["watchlist"]}


@app.delete("/api/users/{user_id}/watchlist/{movie_id}")
# Remove a movie from the user's watchlist.
def remove_watchlist_item(user_id: int, movie_id: str, db=Depends(get_db)):
    get_user_or_404(user_id, db)
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    db.users.update_one(
        {"id": user_id},
        {
            "$pull": {"watchlist_ids": movie["id"]},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    refreshed_user = db.users.find_one({"id": user_id})
    return {"watchlist": build_user_state(refreshed_user, db)["watchlist"]}


# ─── MOVIE ENDPOINTS ───────────────────────────────

movie_creation_lock = threading.Lock()

# Resolve numeric ids and on-demand wiki ids into a movie document.
def resolve_movie_or_fail(movie_id: str, db) -> dict:
    """Resolve an integer ID or a 'wiki:Title' ID into a local database movie document. Creates missing Wiki movies on the fly."""
    if str(movie_id).startswith("wiki:"):
        from wiki_service import fetch_wiki_details
        import urllib.parse
        title = urllib.parse.unquote(str(movie_id)[5:])

        movie = db.movies.find_one({"title": title})
        if not movie:
            with movie_creation_lock:
                # Check again inside the lock
                movie = db.movies.find_one({"title": title})
                if not movie:
                    new_id = get_next_id("movies")
                    movie = {
                        "id": new_id,
                        "tmdb_id": 9000000 + new_id,
                        "title": title,
                        "overview": "",
                        "rating": 0.0,
                        "genre": None,
                        "release_date": None,
                        "poster_path": None,
                        "backdrop_path": None,
                        "popularity": 0.0,
                        "vote_count": 0,
                        "user_rating_sum": 0.0,
                        "user_rating_count": 0,
                        "monthly_score": 0.0,
                        "franchise": None,
                        "wiki_fetched": False,
                    }
                    db.movies.insert_one(movie)

                    # Immediately try to fetch Wikipedia details to populate it
                    try:
                        details = fetch_wiki_details(title, "")
                        update_fields = {}
                        if details.get("wiki_summary"):
                            update_fields["overview"] = details["wiki_summary"][:1000]
                        if details.get("poster_path"):
                            update_fields["poster_path"] = details["poster_path"]
                        cleaned_genre = sanitize_genre_string(details.get("genre"))
                        if cleaned_genre:
                            update_fields["genre"] = cleaned_genre
                        if details.get("franchise"):
                            update_fields["franchise"] = details["franchise"]

                        update_fields["wiki_summary"] = details.get("wiki_summary")
                        update_fields["wiki_plot"] = details.get("wiki_plot")
                        if details.get("wiki_cast"):
                            update_fields["wiki_cast"] = details["wiki_cast"]
                        update_fields["wiki_director"] = details.get("wiki_director")
                        update_fields["wiki_budget"] = details.get("wiki_budget")
                        update_fields["wiki_box_office"] = details.get("wiki_box_office")
                        update_fields["wiki_runtime"] = details.get("wiki_runtime")
                        update_fields["wiki_fetched"] = True

                        if update_fields:
                            db.movies.update_one({"id": new_id}, {"$set": update_fields})
                    except Exception as e:
                        print("Failed to auto-fetch wiki details on creation:", e)

                    movie = db.movies.find_one({"id": new_id})

        return movie

    try:
        m_id = int(movie_id)
        return db.movies.find_one({"id": m_id})
    except ValueError:
        return None

@app.get("/api/search")
# Search local movie titles with a case-insensitive regex match.
def search(q: str = "", db=Depends(get_db)):
    if not q:
        return {"movies": []}

    # Local DB search only (case-insensitive regex)
    regex = re.compile(re.escape(q), re.IGNORECASE)
    local_movies = list(db.movies.find({"title": {"$regex": regex}}))
    return {"movies": [Movie.from_doc(m) for m in local_movies]}

@app.get("/api/movies")
# Return paginated movies with optional genre, director, and sort filters.
def list_movies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    genre: str = None,
    director: str = None,
    sort_by: str = "popularity",
    db=Depends(get_db),
):
    and_conditions = []
    if genre:
        genres_list = [g.strip() for g in genre.split(",")]
        # Match ALL of the selected genres
        for g in genres_list:
            and_conditions.append({"genre": {"$regex": re.escape(g), "$options": "i"}})
        
    if director:
        directors_list = [d.strip() for d in director.split(",")]
        and_conditions.append({"$or": [{"wiki_director": {"$regex": re.escape(d), "$options": "i"}} for d in directors_list]})
        
    query_filter = {}
    if and_conditions:
        query_filter = {"$and": and_conditions} if len(and_conditions) > 1 else and_conditions[0]

    # Determine sort field
    if sort_by == "rating":
        sort_field = [("rating", -1)]
    elif sort_by == "release_date":
        sort_field = [("release_date", -1)]
    else:
        sort_field = [("popularity", -1)]

    total = db.movies.count_documents(query_filter)
    
    # Fallback logic: if 0 results and filters were applied, return randomized matches for ANY selected filter
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


@app.get("/api/movies/trending")
# Return the most popular movies for the homepage spotlight.
def trending_movies(db=Depends(get_db)):
    movies = list(db.movies.find().sort("popularity", -1).limit(5))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@app.get("/api/movies/top-month")
# Return the current monthly top-ranked movies.
def top_month(db=Depends(get_db)):
    movies = list(db.movies.find().sort("monthly_score", -1).limit(10))
    return {"movies": [Movie.from_doc(m) for m in movies]}


@app.get("/api/movies/{movie_id}")
# Return one movie by id, including wiki-backed ids when needed.
def get_movie(movie_id: str, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404
    return Movie.from_doc(movie)


@app.get("/api/movies/{movie_id}/recommend")
# Return content-based recommendations for a movie.
def recommend(movie_id: str, top_n: int = 10, db=Depends(get_db)):
    if not model_loaded:
        return {"recommendations": []}

    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"recommendations": []}

    # get_recommendations returns a list of dictionaries with an 'id'
    recs = get_recommendations(movie["id"], top_n)
    rec_movies = []

    for rec in recs:
        m = db.movies.find_one({"id": rec["id"]})
        if m:
            rec_movies.append(Movie.from_doc(m))

    return {"recommendations": rec_movies}

@app.get("/api/genres")
def get_genres(db=Depends(get_db)):
    pipeline = [
        {"$project": {"genres": {"$split": ["$genre", ", "]}}},
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres"}},
        {"$sort": {"_id": 1}}
    ]
    genres_raw = [doc["_id"] for doc in db.movies.aggregate(pipeline) if doc["_id"]]
    # Clean up dirty data: only allow reasonable length genres (max 2 words, max 20 chars)
    genres = [g for g in genres_raw if len(g) <= 20 and g.count(" ") <= 1 and "\n" not in g]
    return {"genres": genres}

@app.get("/api/directors")
def get_directors(db=Depends(get_db)):
    pipeline = [
        {"$match": {"wiki_director": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$wiki_director", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 7}
    ]
    directors = [doc["_id"] for doc in db.movies.aggregate(pipeline) if doc["_id"]]
    return {"directors": directors}


# ─── WIKIPEDIA DETAIL ENDPOINT ─────────────────────

@app.get("/api/movies/{movie_id}/wiki")
# Fetch cached wiki details or enrich the movie on first request.
def get_wiki_details(movie_id: str, db=Depends(get_db)):
    """Fetch Wikipedia details for a movie. Cached in DB after first fetch."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # If already fetched, return cached data
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

    # Fetch from Wikipedia
    from wiki_service import fetch_wiki_details
    year = movie.get("release_date", "")[:4] if movie.get("release_date") else ""
    title = movie["title"]

    details = fetch_wiki_details(title, year)

    # Cache in DB
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


# ─── COMMENTS ENDPOINTS ────────────────────────────

@app.get("/api/movies/{movie_id}/comments")
# Return all comments for the requested movie.
def get_comments(movie_id: str, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"comments": [], "count": 0}

    comments = list(
        db.comments.find({"movie_id": movie["id"]}).sort("created_at", -1)
    )
    return {
        "comments": [Comment.from_doc(c) for c in comments],
        "count": len(comments),
    }


@app.post("/api/movies/{movie_id}/comments")
# Store a new comment and update rating totals when provided.
def post_comment(movie_id: str, comment: CommentCreate, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    new_comment = {
        "id": get_next_id("comments"),
        "movie_id": movie["id"],
        "user_name": comment.user_name,
        "user_email": comment.user_email,
        "content": comment.content,
        "rating": comment.rating,
        "created_at": datetime.now(timezone.utc),
    }
    db.comments.insert_one(new_comment)

    # If the comment includes a rating, update the movie's aggregated rating
    if comment.rating is not None and 1 <= comment.rating <= 10:
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": comment.rating, "user_rating_count": 1}}
        )
        # Recalculate global top 10 score dynamically based on the new rating
        threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    if comment.user_id is not None:
        db.users.update_one(
            {"id": comment.user_id},
            {
                "$inc": {"stats.comment_count": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    # Re-fetch movie for updated rating
    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "comment": Comment.from_doc(new_comment),
        "movie_rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
    }


# ─── RATING ENDPOINT ───────────────────────────────

@app.post("/api/movies/{movie_id}/rate")
# Create or update a user's rating for a movie.
def rate_movie(movie_id: str, rating_data: RatingCreate, db=Depends(get_db)):
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if not (1 <= rating_data.rating <= 10):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

    # Check if user already rated
    existing = db.user_ratings.find_one({
        "movie_id": movie["id"],
        "user_id": rating_data.user_id,
    })

    if existing:
        # Update: subtract old, add new
        old_rating = existing["rating"]
        db.user_ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": {"rating": rating_data.rating}}
        )
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": rating_data.rating - old_rating}}
        )
    else:
        # New rating
        new_rating = {
            "id": get_next_id("user_ratings"),
            "movie_id": movie["id"],
            "user_id": rating_data.user_id,
            "rating": rating_data.rating,
            "created_at": datetime.now(timezone.utc),
        }
        db.user_ratings.insert_one(new_rating)
        db.movies.update_one(
            {"id": movie["id"]},
            {"$inc": {"user_rating_sum": rating_data.rating, "user_rating_count": 1}}
        )

    try:
        parsed_user_id = int(rating_data.user_id)
    except (TypeError, ValueError):
        parsed_user_id = None

    if parsed_user_id is not None:
        db.users.update_one(
            {"id": parsed_user_id},
            {
                "$addToSet": {"stats.rated_movie_ids": movie["id"]},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    # Recalculate dynamic tracking score for this movie since rating changed
    threading.Thread(target=update_movie_score, args=(movie["id"],), daemon=True).start()

    # Re-fetch for latest data
    updated_movie = db.movies.find_one({"id": movie["id"]})
    return {
        "rating": Movie.from_doc(updated_movie)["rating"],
        "user_rating_count": updated_movie.get("user_rating_count", 0),
        "your_rating": rating_data.rating,
    }


# ─── STREAMING PLATFORMS (REGION-AWARE) ─────────────

@app.get("/api/movies/{movie_id}/streaming")
# Return region-aware streaming search links for a movie.
def get_streaming(movie_id: str, request: Request, country: str = None, db=Depends(get_db)):
    """Get streaming platform links based on user's country."""
    movie = resolve_movie_or_fail(movie_id, db)
    if not movie:
        return {"error": "Movie not found"}, 404

    # Detect country from query param or request header
    if not country:
        country = "IN"  # Default to India for now

    from wiki_service import get_streaming_links
    links = get_streaming_links(movie["title"], country)

    return {
        "country": country,
        "platforms": links,
    }
