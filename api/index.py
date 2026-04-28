from pathlib import Path
import sys

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"
FRONTEND_INDEX = FRONTEND_DIST_DIR / "index.html"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app as backend_app

app = backend_app

if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="assets")


def get_frontend_file_response(relative_path: str):
    frontend_root = FRONTEND_DIST_DIR.resolve()
    requested_file = (FRONTEND_DIST_DIR / relative_path).resolve()

    try:
        requested_file.relative_to(frontend_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not Found")

    if requested_file.is_file():
        return FileResponse(requested_file)

    return None


@app.get("/", include_in_schema=False)
def serve_frontend_root():
    if FRONTEND_INDEX.exists():
        return FileResponse(FRONTEND_INDEX)
    raise HTTPException(status_code=404, detail="Frontend build not found")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_route(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    frontend_file = get_frontend_file_response(full_path)
    if frontend_file is not None:
        return frontend_file

    if FRONTEND_INDEX.exists():
        return FileResponse(FRONTEND_INDEX)
    raise HTTPException(status_code=404, detail="Frontend build not found")
