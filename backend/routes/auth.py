from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError

from database import get_db, get_next_id
from utils.helpers import normalize_email, hash_password, verify_password, make_avatar
from models.schemas import SignupCreate, LoginCreate, GoogleAuthCreate, FacebookAuthCreate
from models.entities import DEFAULT_USER_SETTINGS, DEFAULT_USER_STATS
from services.auth_service import verify_google_credential, verify_facebook_access_token, upsert_social_user
from services.user_service import build_user_state

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
def signup(payload: SignupCreate, db=Depends(get_db)):
    """Register a new local user via email and password."""
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


@router.post("/login")
def login(payload: LoginCreate, db=Depends(get_db)):
    """Authenticate a user via email and password."""
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


@router.post("/google")
def google_login(payload: GoogleAuthCreate, db=Depends(get_db)):
    """Authenticate or register a user via Google sign-in."""
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


@router.post("/facebook")
def facebook_login(payload: FacebookAuthCreate, db=Depends(get_db)):
    """Authenticate or register a user via Facebook sign-in."""
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
