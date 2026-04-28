import os
import hashlib
import secrets
from typing import Optional
from fastapi import HTTPException

def ensure_unique_index(collection, keys, name: str):
    """Ensure a specific unique index exists on a MongoDB collection."""
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


def ensure_unique_sparse_index(collection, key: str, name: str):
    """Ensure a sparse unique index exists for optional fields."""
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


def normalize_email(email: str) -> str:
    """Normalize an email address for consistent auth lookups."""
    return (email or "").strip().lower()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hash a password using PBKDF2 for secure storage."""
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    ).hex()
    return salt, password_hash


def verify_password(password: str, user_doc: dict) -> bool:
    """Compare a plaintext password against the stored user hash."""
    salt = user_doc.get("password_salt")
    expected_hash = user_doc.get("password_hash")
    if not salt or not expected_hash:
        return False
    _, password_hash = hash_password(password, salt)
    return password_hash == expected_hash


def make_avatar(name: str, email: str) -> str:
    """Build a simple fallback avatar initial from user info."""
    source = (name or "").strip() or normalize_email(email)
    return source[:1].upper() if source else "C"


def get_required_env(name: str) -> str:
    """Read a required environment variable or fail loudly."""
    value = os.environ.get(name, "").strip()
    if value:
        return value
    raise HTTPException(status_code=503, detail=f"{name} is not configured on the server")


def merge_auth_providers(existing_providers: Optional[list], provider: str) -> list[str]:
    """Add a social provider to the user's list without duplication."""
    providers = [p for p in (existing_providers or []) if p]
    if provider not in providers:
        providers.append(provider)
    return providers


def provider_field_name(provider: str) -> str:
    """Map a provider name to the matching MongoDB field."""
    if provider == "google":
        return "google_sub"
    raise HTTPException(status_code=400, detail="Unsupported authentication provider")
