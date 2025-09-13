# backend/models.py
from sqlalchemy import Column, String, Float, DateTime, create_engine, Integer
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

Base = declarative_base()

class Post(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True, index=True)
    keyword = Column(String, index=True)
    source = Column(String)
    author = Column(String)
    text = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sentiment_score = Column(Float)
    sentiment_label = Column(String)
    country_code = Column(String(2), index=True, default=None)

# Use globalinsights.db instead of sentiscout.db
DATABASE_URL = "sqlite:///globalinsights.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
