import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, chat, auth
from app.engine.duckdb_engine import db_engine

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade AI Data Analyst powered by FastAPI, DuckDB, LangGraph, and OpenRouter.",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(auth.router)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "registered_tables": list(db_engine.registered_tables.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
