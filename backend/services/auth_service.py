from datetime import datetime, timezone
import requests
from typing import Optional
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
except ModuleNotFoundError:
    google_requests = None
    google_id_token = None

from database import get_next_id
from utils.helpers import get_required_env, normalize_email, make_avatar, merge_auth_providers, provider_field_name
from models.entities import DEFAULT_USER_SETTINGS, DEFAULT_USER_STATS

def verify_google_credential(credential: str) -> dict:
    """Verify a Google token and normalize the returned profile payload."""
    client_id = get_required_env("GOOGLE_CLIENT_ID")

    if credential.count(".") == 2:
        if google_requests is None or google_id_token is None:
            raise HTTPException(
                status_code=503,
                detail="Google ID token verification is unavailable because google-auth is not installed",
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



def upsert_social_user(
    db,
    *,
    provider: str,
    provider_user_id: str,
    email: str,
    name: str,
    avatar: Optional[str] = None,
) -> dict:
    """Create or update a user record for Google sign-in."""
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
