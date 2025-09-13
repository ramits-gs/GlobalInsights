# backend/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from models import init_db, SessionLocal, Post
from ingest import ingest_sample

init_db()
app = FastAPI(title="GlobalInsights API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def normalize_keyword(q: str) -> str:
    return q.strip().lower()

@app.get("/api/search")
def search(q: str, hours: int = 24, use_sample: bool = False):
    kw = normalize_keyword(q)
    sess = SessionLocal()
    if use_sample:
        ingest_sample(kw)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = (sess.query(Post)
            .filter(Post.keyword == kw, Post.created_at >= cutoff)
            .order_by(Post.created_at.desc())
            .all())
    sess.close()
    return {
        "keyword": kw,
        "count": len(rows),
        "posts": [
            {
                "id": r.id,
                "source": r.source,
                "author": r.author,
                "text": r.text,
                "created_at": r.created_at.isoformat(),
                "sentiment_score": r.sentiment_score,
                "sentiment_label": r.sentiment_label,
                "country_code": r.country_code,
            } for r in rows
        ]
    }

@app.get("/api/geo")
def geo(q: str, hours: int = 24):
    kw = normalize_keyword(q)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    sess = SessionLocal()
    rows = (sess.query(
                Post.country_code.label("cc"),
                func.count(Post.id).label("n"),
                func.avg(Post.sentiment_score).label("avg"))
            .filter(Post.keyword == kw, Post.created_at >= cutoff, Post.country_code.isnot(None))
            .group_by(Post.country_code)
            .all())
    sess.close()
    return {
        "keyword": kw,
        "hours": hours,
        "countries": [{"cc": r.cc, "n": r.n, "avg": float(r.avg)} for r in rows]
    }
