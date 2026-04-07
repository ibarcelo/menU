"""
menU – FastAPI backend entry point.
Run from repo root:  start-backend.bat
Run from backend/:   uvicorn main:app --reload
"""

import logging
import sys
import os

# Ensure backend/ is on the path regardless of working directory
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
os.chdir(_backend_dir)  # also change cwd so .env is found

import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db.supabase_client import get_settings
from routers import menu, orders, scan, sessions

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="menU API",
    description="Restaurant menu scanning + collaborative ordering",
    version="0.1.0",
)

# CORS – allow frontend origins
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(sessions.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logging.error("Unhandled exception:\n%s", tb)
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})


@app.get("/health")
async def health():
    return {"status": "ok"}
