import os
import json
import time
from dotenv import load_dotenv

# Load env variables
load_dotenv()

import google.generativeai as genai
from database import engine, SessionLocal, Base
from models import Movie
from recommendation import build_recommendation_model
from wiki_service import _get_summary, _search_wiki_page

api_key = os.environ.get("GEMINI_API_KEY", "")
if not api_key:
    print("❌ GEMINI_API_KEY not found in .env file.")
    exit(1)

genai.configure(api_key=api_key)

def generate_movies_batch(region="Hollywood", count=40):
    print(f"🤖 Asking Gemini to generate {count} top {region} movies from the last 4 years (2022-2025)...")
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"""
    You are a movie expert. Generate a JSON list of EXACTLY {count} top {region} movies released between 2022 and 2025.
    Choose highly popular, critically acclaimed, or box office hit movies.
    Return ONLY a valid JSON array of objects with the following keys. Do not include markdown code block syntax, just the raw JSON.
    [
      {{
        "title": "Movie Title",
        "release_date": "2024-05-10",
        "genre": "Action, Sci-Fi",
        "overview": "A brief 2-sentence description of the movie plot.",
        "rating": 8.5,
        "wikipedia_title": "Movie Title (2024 film)"
      }}
    ]
    Make sure the 'wikipedia_title' is the EXACT article title on English Wikipedia so we can reliably fetch the official poster.
    """
    
    response = model.generate_content(
        prompt, 
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=8192,
            response_mime_type="application/json"
        )
    )
    text = response.text.strip()
    
    # Strip markdown if present
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    try:
        movies = json.loads(text)
        return movies
    except Exception as e:
        print(f"❌ Failed to parse JSON for {region}. Error: {e}")
        return []

def repopulate_database():
    print("🎬 CineStream AI Database Repopulation (Gemini)")
    print("=" * 50)

    db = SessionLocal()
    try:
        print("🗑️ Clearing existing movie records...")
        db.query(Movie).delete()
        db.commit()
        print("✅ Cleared movies successfully. Structure intact.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error clearing database: {e}")
        return
        
    # Get Movies (Smaller batches to prevent API cutoff)
    hollywood = generate_movies_batch("Hollywood", 25)
    bollywood = generate_movies_batch("Bollywood/Indian", 25)
    
    all_movies = hollywood + bollywood
    if not all_movies:
        print("❌ No movies generated. Exiting.")
        return
        
    print(f"✅ Generated {len(all_movies)} movies total. Fetching accuracy and posters from Wikipedia...")
    
    inserted = 0
    t_id = 9000000 # Custom base TMDB ID
    
    for i, m in enumerate(all_movies):
        wiki_title = m.get("wikipedia_title", m["title"])
        print(f"[{i+1}/{len(all_movies)}] Processing: {m['title']}")
        
        poster_path = None
        # 1. Try fetching exact title from Wikipedia API
        summary = _get_summary(wiki_title)
        
        if summary and summary.get("poster_path"):
            poster_path = summary["poster_path"]
        else:
            # 2. Fallback: Search Wikipedia for the movie
            fallback_title = _search_wiki_page(f"{m['title']} film")
            if fallback_title:
                sum2 = _get_summary(fallback_title)
                if sum2 and sum2.get("poster_path"):
                    poster_path = sum2["poster_path"]
                    
        if not poster_path:
            print(f"   ⚠️ Could not find official poster for {m['title']}. Skipping to avoid incorrect media.")
            continue
            
        try:
            db_movie = Movie(
                tmdb_id=t_id + i,
                title=m["title"],
                genre=m["genre"],
                overview=m["overview"],
                rating=float(m.get("rating", 0.0)),
                release_date=m.get("release_date", "")[:10],
                poster_path=poster_path,
                popularity=float(m.get("rating", 0.0)) * 10.0,
                vote_count=500
            )
            db.add(db_movie)
            inserted += 1
        except Exception as e:
            print(f"   ❌ Error inserting {m['title']}: {e}")
            
        # tiny sleep to respect Wikipedia rate limits
        time.sleep(0.1)
            
    try:
        print(f"💾 Saving {inserted} movies to SQLite database...")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Error committing movies to database: {e}")
        return
    finally:
        db.close()

    # Rebuild recommendation model
    print("\n🧠 Rebuilding local recommendation model (TF-IDF Cosine Similarity) with new dataset...")
    db = SessionLocal()
    try:
        all_movies_db = db.query(Movie).all()
        movies_for_model = [
            {
                "id": m.id,
                "title": m.title,
                "genre": m.genre or "",
                "overview": m.overview or "",
                "rating": m.rating,
                "release_date": m.release_date,
                "poster_path": m.poster_path,
                "backdrop_path": m.backdrop_path,
                "popularity": m.popularity,
            }
            for m in all_movies_db
        ]
        build_recommendation_model(movies_for_model)
    finally:
        db.close()

    print("\n🎉 Repopulation complete! All previous movies erased and replaced with dynamic accurate data.")

if __name__ == "__main__":
    repopulate_database()
