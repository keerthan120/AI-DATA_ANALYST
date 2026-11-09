import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"[Database] Warning: PostgreSQL connect failed ({e}). Falling back to SQLite.")
    DATABASE_URL = "sqlite:///./data_analyst_auth.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
