"""
Fetch movie details from Wikipedia API and cache in database.
Uses the free Wikipedia REST API (no key needed).
"""

import requests
import json
import re
import os
from dotenv import load_dotenv

# Load env variables (like GEMINI_API_KEY)
load_dotenv()

try:
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        genai.configure(api_key=api_key)
        GEMINI_AVAILABLE = True
    else:
        GEMINI_AVAILABLE = False
except Exception:
    GEMINI_AVAILABLE = False


WIKI_API = "https://en.wikipedia.org/api/rest_v1"
WIKI_SEARCH = "https://en.wikipedia.org/w/api.php"

# Wikimedia requires a descriptive User-Agent
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "CineStreamApp/1.0 (github.com/test/cinestream)"})


def fetch_wiki_details(movie_title: str, release_year: str = "") -> dict:
    """
    Fetch detailed movie info from Wikipedia.
    Returns dict with summary, plot, cast, director, budget, box_office, runtime.
    """
    result = {
        "wiki_summary": None,
        "wiki_plot": None,
        "wiki_cast": None,
        "wiki_director": None,
        "wiki_budget": None,
        "wiki_box_office": None,
        "wiki_runtime": None,
        "poster_path": None,
        "genre": None,
        "franchise": None,
    }

    # Search for the movie article
    search_query = f"{movie_title} film"
    if release_year:
        search_query = f"{movie_title} ({release_year} film)"

    try:
        # First try with year-specific title
        page_title = _search_wiki_page(search_query, movie_title)
        if not page_title:
            # Fallback to just the movie title
            page_title = _search_wiki_page(f"{movie_title} film", movie_title)
        if not page_title:
            return result

        # Get summary
        summary_data = _get_summary(page_title)
        if summary_data["extract"]:
            result["wiki_summary"] = summary_data["extract"]
            
            # Predict genre and franchise using Gemini
            if GEMINI_AVAILABLE:
                try:
                    model = genai.GenerativeModel("gemini-2.5-flash")
                    prompt = f"Analyze this movie summary and return a JSON object with keys 'genre' (comma-separated string, max 3) and 'franchise' (string of the Cinematic Universe or Franchise it belongs to, e.g. 'Marvel Cinematic Universe'. Set to null if standalone):\n\n{summary_data['extract']}"
                    resp = model.generate_content(prompt, generation_config=genai.types.GenerationConfig(response_mime_type="application/json"))
                    data = json.loads(resp.text)
                    result["genre"] = data.get("genre")
                    result["franchise"] = data.get("franchise")
                except Exception:
                    pass
            
        if summary_data["poster_path"]:
            result["poster_path"] = summary_data["poster_path"]

        # Get full article extract for parsing details
        full_text = _get_article_text(page_title)
        if full_text:
            result["wiki_plot"] = _extract_section(full_text, ["Plot", "Synopsis", "Summary"])
            result["wiki_director"] = _extract_infobox_field(full_text, ["Directed by", "Director"])
            result["wiki_budget"] = _extract_infobox_field(full_text, ["Budget"])
            result["wiki_box_office"] = _extract_infobox_field(full_text, ["Box office", "Gross"])
            result["wiki_runtime"] = _extract_infobox_field(full_text, ["Running time", "Runtime"])
            
            # Extract genre from Wikipedia info box if Gemini failed or wasn't available
            wiki_genre = _extract_infobox_field(full_text, ["Genre", "Genres"])
            if wiki_genre and not result.get("genre"):
                result["genre"] = wiki_genre.strip()[:100] # Ensure it doesn't overflow

            # Extract cast
            cast_text = _extract_section(full_text, ["Cast", "Cast and characters"])
            if cast_text:
                cast_members = _parse_cast_list(cast_text)
                result["wiki_cast"] = json.dumps(cast_members[:12])  # Top 12

    except Exception as e:
        print(f"Wikipedia fetch error for '{movie_title}': {e}")

    return result


def search_wiki_movies(query: str) -> list[dict]:
    """Search Wikipedia for movies using Gemini for intelligent franchise mapping and strict filtering."""
    
    # 1. If Gemini is available, use it to generate the exact Wikipedia article titles.
    if GEMINI_AVAILABLE:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = f"""You are a movie and TV recommendation expert. The user searched for: "{query}".
Return a JSON array of up to 8 objects containing exact Wikipedia article titles and their primary genres that match this query.
CRITICAL RULES:
1. ALWAYS use the exact English Wikipedia article title (e.g., "The Lord of the Rings: The Fellowship of the Ring", "The Avengers (2012 film)"). Make sure disambiguations like "(film)" are included if required by Wikipedia.
2. If the query is a franchise (like "Avengers" or "Batman" or "Lord of the Rings"), return the titles of the main movies in that franchise!
3. ONLY return movies, films, or TV series.
4. Output NOTHING but a valid JSON array of objects with keys "title" (exact wiki title), "genre" (comma-separated, max 3, e.g. "Action, Sci-Fi"), and "franchise" (string of the Cinematic Universe or Franchise it belongs to, like "Marvel Cinematic Universe" or "The Conjuring Universe". Set to null if it's a standalone movie)."""
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            # Extract JSON block using regex to handle variations
            import re
            text = response.text.strip()
            # Try to find array brackets even if not wrapped in markdown
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                text = match.group(0)
            else:
                text = text.replace("```json", "").replace("```", "").strip()
            
            print("GEMINI TEXT:", text)
            items = json.loads(text)
            
            results = []
            for item in items:
                # Handle cases where Gemini still returns a list of strings by accident
                if isinstance(item, str):
                    title = item
                    genre = ""
                else:
                    title = item.get("title")
                    genre = item.get("genre", "")
                    
                if not title:
                    continue
                    
                # Fetch exact summary for each title
                summary_data = _get_summary(title)
                if not summary_data or not summary_data.get("extract"):
                    continue
                
                results.append({
                    "id": f"wiki:{summary_data['title']}",
                    "title": summary_data["title"],
                    "overview": summary_data["extract"],
                    "poster_path": summary_data["poster_path"],
                    "backdrop_path": None,
                    "rating": 0.0,
                    "release_date": "",
                    "genre": genre,
                    "popularity": 0
                })
            
            # If Gemini successfully found movies, return them!
            if results:
                return results
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return [{"title": f"ERROR: {str(e)}", "genre": "ERROR"}]
            
    # 2. Fallback to standard explicit Wikipedia Search if no key or Gemini fails
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} film",
        "prop": "pageimages|extracts",
        "piprop": "thumbnail",
        "pithumbsize": 500,
        "exchars": 200,
        "exintro": 1,
        "explaintext": 1,
        "format": "json",
    }
    
    try:
        resp = SESSION.get(WIKI_SEARCH, params=params, timeout=5)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        
        results = []
        for page_id, page_data in pages.items():
            title = page_data.get("title", "")
            title_lower = title.lower()
            if "disambiguation" in title_lower or "soundtrack" in title_lower:
                continue
            
            overview = page_data.get("extract", "")
            overview_lower = overview.lower()
            
            # Strict Movie Filter: Only allow pages that are explicitly films
            is_movie = False
            if "(film)" in title_lower or "(movie)" in title_lower:
                is_movie = True
            elif " film" in overview_lower[:200] or " movie" in overview_lower[:200]:
                is_movie = True
            elif "directed by" in overview_lower[:200] or "cinematography" in overview_lower[:200]:
                is_movie = True
                
            if not is_movie:
                continue
                
            poster_path = None
            if "thumbnail" in page_data:
                poster_path = page_data["thumbnail"].get("source")
                
            results.append({
                "id": f"wiki:{title}",
                "title": title,
                "overview": overview,
                "poster_path": poster_path,
                "backdrop_path": None,
                "rating": 0.0,
                "release_date": "",
                "genre": "",
                "popularity": 0
            })
            
        return results
    except Exception as e:
        print(f"Wiki search error: {e}")
        return []


def _search_wiki_page(query: str, original_title: str = "") -> str | None:
    """Search Wikipedia and return the best matching page title."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json",
        "srlimit": 5,
    }
    try:
        resp = SESSION.get(WIKI_SEARCH, params=params, timeout=4)
        resp.raise_for_status()
        results = resp.json().get("query", {}).get("search", [])
        
        if not results:
            return None
            
        exact_title = original_title.lower() if original_title else query.lower().replace(" film", "").replace(" (", "").strip()
        
        # 1. Look for exact match
        for r in results:
            t = r.get("title", "")
            if t.lower() == exact_title:
                return t
                
        # 2. Look for exact match + (film)
        for r in results:
            t = r.get("title", "")
            if t.lower() == f"{exact_title} (film)" or t.lower().startswith(f"{exact_title} ("):
                return t
                
        # 3. Look for substring match with "film"
        for r in results:
            t = r.get("title", "")
            if "film" in t.lower() and exact_title in t.lower():
                return t
                
        # 4. Fallback to just the first result if it loosely contains the first word
        first_word = exact_title.split()[0] if exact_title else ""
        for r in results:
            t = r.get("title", "")
            if first_word and first_word in t.lower():
                return t
                
        return results[0]["title"]
    except Exception:
        pass
    return None


def _get_summary(page_title: str) -> dict:
    """Get the summary/extract and thumbnail of a Wikipedia page."""
    try:
        url = f"{WIKI_API}/page/summary/{requests.utils.quote(page_title)}"
        resp = SESSION.get(url, timeout=4)
        resp.raise_for_status()
        data = resp.json()
        
        poster_path = None
        if "thumbnail" in data:
            poster_path = data["thumbnail"].get("source")
            
        return {
            "title": data.get("title", page_title),
            "extract": data.get("extract", None),
            "poster_path": poster_path
        }
    except Exception:
        return {"extract": None, "poster_path": None, "title": page_title}


def _get_article_text(page_title: str) -> str | None:
    """Get the full text of a Wikipedia article."""
    params = {
        "action": "query",
        "titles": page_title,
        "prop": "extracts",
        "explaintext": True,
        "format": "json",
    }
    try:
        resp = SESSION.get(WIKI_SEARCH, params=params, timeout=5)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if page_id != "-1":
                return page_data.get("extract", None)
    except Exception:
        pass
    return None


def _extract_section(text: str, section_names: list[str]) -> str | None:
    """Extract a section from Wikipedia article text by heading."""
    if not text:
        return None

    for name in section_names:
        # Look for == Section Name == pattern
        pattern = rf"==\s*{re.escape(name)}\s*==\s*\n(.*?)(?=\n==|$)"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1).strip()
            # Clean up sub-sections
            content = re.sub(r"===.*?===", "", content)
            content = content.strip()
            if len(content) > 50:  # Only return if substantive
                return content[:3000]  # Cap at 3000 chars
    return None


def _extract_infobox_field(text: str, field_names: list[str]) -> str | None:
    """Try to extract an infobox-style field from the article text."""
    if not text:
        return None
    # Wikipedia plain text doesn't have the infobox, but sometimes data is in the lead
    for name in field_names:
        pattern = rf"{re.escape(name)}[:\s]+([^\n]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if len(value) < 200:
                return value
    return None


def _parse_cast_list(cast_text: str) -> list[str]:
    """Parse cast names from a cast section."""
    lines = cast_text.split("\n")
    cast = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("="):
            continue
        # Extract the first name-like portion
        # Often format: "Actor Name as Character Name"
        parts = re.split(r"\s+as\s+", line, maxsplit=1)
        name = parts[0].strip()
        # Clean up bullets, numbers etc
        name = re.sub(r"^[\*\-•\d\.\)]+\s*", "", name)
        if name and len(name) > 2 and len(name) < 60:
            if len(parts) > 1:
                cast.append(f"{name} as {parts[1].strip()[:40]}")
            else:
                cast.append(name)
    return cast


# ─── STREAMING PLATFORMS BY REGION ──────────────────────────

STREAMING_PLATFORMS = {
    "IN": [  # India
        {"name": "JioCinema", "url": "https://www.jiocinema.com/search/", "icon": "play_circle"},
        {"name": "Netflix India", "url": "https://www.netflix.com/search?q=", "icon": "play_circle"},
        {"name": "Amazon Prime Video", "url": "https://www.primevideo.com/search/?phrase=", "icon": "play_circle"},
        {"name": "Disney+ Hotstar", "url": "https://www.hotstar.com/in/search?q=", "icon": "play_circle"},
        {"name": "Zee5", "url": "https://www.zee5.com/search?q=", "icon": "play_circle"},
        {"name": "SonyLIV", "url": "https://www.sonyliv.com/search?searchTerm=", "icon": "play_circle"},
    ],
    "US": [  # United States
        {"name": "Netflix", "url": "https://www.netflix.com/search?q=", "icon": "play_circle"},
        {"name": "Amazon Prime Video", "url": "https://www.amazon.com/s?k=", "icon": "play_circle"},
        {"name": "Disney+", "url": "https://www.disneyplus.com/search/", "icon": "play_circle"},
        {"name": "Hulu", "url": "https://www.hulu.com/search?q=", "icon": "play_circle"},
        {"name": "HBO Max", "url": "https://play.max.com/search?q=", "icon": "play_circle"},
        {"name": "Apple TV+", "url": "https://tv.apple.com/search?term=", "icon": "play_circle"},
    ],
    "GB": [  # United Kingdom
        {"name": "Netflix UK", "url": "https://www.netflix.com/search?q=", "icon": "play_circle"},
        {"name": "Amazon Prime Video", "url": "https://www.primevideo.com/search/?phrase=", "icon": "play_circle"},
        {"name": "Disney+", "url": "https://www.disneyplus.com/search/", "icon": "play_circle"},
        {"name": "BBC iPlayer", "url": "https://www.bbc.co.uk/iplayer/search?q=", "icon": "play_circle"},
        {"name": "Now TV", "url": "https://www.nowtv.com/search?q=", "icon": "play_circle"},
    ],
    "DEFAULT": [
        {"name": "Netflix", "url": "https://www.netflix.com/search?q=", "icon": "play_circle"},
        {"name": "Amazon Prime Video", "url": "https://www.primevideo.com/search/?phrase=", "icon": "play_circle"},
        {"name": "Disney+", "url": "https://www.disneyplus.com/search/", "icon": "play_circle"},
        {"name": "Apple TV+", "url": "https://tv.apple.com/search?term=", "icon": "play_circle"},
    ],
}


def get_streaming_links(movie_title: str, country_code: str = "DEFAULT") -> list[dict]:
    """Get streaming platform links for a movie based on the user's country."""
    code = country_code.upper() if country_code.upper() in STREAMING_PLATFORMS else "DEFAULT"
    platforms = STREAMING_PLATFORMS[code]

    encoded_title = requests.utils.quote(movie_title)
    return [
        {
            "name": p["name"],
            "url": f"{p['url']}{encoded_title}",
            "icon": p["icon"],
        }
        for p in platforms
    ]

# Trigger reload
