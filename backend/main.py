import os
import threading
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from database import get_db
from utils.helpers import ensure_unique_index, ensure_unique_sparse_index
from recommendation import load_model
from ranking import recalculate_all_scores

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.movies import router as movies_router
from routes.comments import router as comments_router
from routes.system import router as system_router

IS_VERCEL = bool(os.environ.get("VERCEL"))

app = FastAPI(title="CineStream API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(movies_router)
app.include_router(comments_router)
app.include_router(system_router)

@app.on_event("startup")
def startup():
    """Initialize application state on startup."""
    similarity, df = load_model()
    db = get_db()
    
    ensure_unique_index(db.users, [("email", 1)], "users_email_unique")
    ensure_unique_sparse_index(db.users, "google_sub", "users_google_sub_unique")
    ensure_unique_index(
        db.user_ratings,
        [("movie_id", 1), ("user_id", 1)],
        "user_ratings_movie_user_unique",
    )

    if similarity is not None and df is not None:
        print(f"✅ Model loaded on startup ({len(df)} movies)")
    else:
        print("⚠️ No pickled model found — run seed.py first")

    if IS_VERCEL:
        print("⏭️ Skipping startup ranking recalculation on Vercel serverless runtime.")
        return

    threading.Thread(target=recalculate_all_scores, daemon=True).start()
    print("📈 Triggered background calculation of Dynamic Monthly Top 10 Scores.")
