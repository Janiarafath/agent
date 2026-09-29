import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Connects to a Cloud PostgreSQL database (e.g., Supabase, Neon, AWS RDS)
# Defaults to a local SQLite for immediate demo testing if no URL is provided.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./growthpilot_demo.db")

# Postgres requires a specific connection string format in SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
