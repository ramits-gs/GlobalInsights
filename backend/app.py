# backend/app.py
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

# add near other imports
from fastapi import Body
from gemini_chat import chat_reply
from typing import Dict, Any


from models import init_db, SessionLocal, Post
from ingest import (
    ingest_sample,
    ingest_live,
    iter_youtube_live,
    iter_news_newsapi,
)
# Optional insights (Gemini summarization)
try:
    from gemini_helper import summarize_posts
    _HAS_INSIGHTS = True
except Exception:
    _HAS_INSIGHTS = False

# --- init ---
init_db()
app = FastAPI(title="GlobalInsights API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For hackathon/demo; tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

def normalize_keyword(q: str) -> str:
    return (q or "").strip().lower()

# --- routes ---

@app.get("/api/search")
def search(
    q: str = Query(..., description="Search keyword"),
    hours: int = 24,
    use_sample: bool = False,
    sources: str = "youtube,news",
    engine: str = Query("auto", description="Sentiment engine: gemini|vader|auto"),
):
    """
    Ingest (sample or live) + return recent posts for keyword.
    - use_sample=true -> loads backend/sample_data.json (kept in DB for reuse)
    - live: pulls from YouTube comments and/or NewsAPI articles, then stores in DB
    - hours: time window for what to return from DB
    - engine: 'gemini' | 'vader' | 'auto' (auto uses env default w/ fallback)
    """
    kw = normalize_keyword(q)
    sess = SessionLocal()

    if use_sample:
        ingest_sample(kw, engine_choice=engine)
    else:
        srcs = [s.strip().lower() for s in (sources or "").split(",") if s.strip()]
        items = []
        if "youtube" in srcs:
            items.extend(iter_youtube_live(kw))
        if "news" in srcs:
            items.extend(iter_news_newsapi(kw, page_size=30))
        if items:
            ingest_live(kw, items, engine_choice=engine)

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows: List[Post] = (
        sess.query(Post)
        .filter(Post.keyword == kw, Post.created_at >= cutoff)
        .order_by(Post.created_at.desc())
        .all()
    )
    sess.close()

    return {
        "keyword": kw,
        "engine_used": engine,
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
            }
            for r in rows
        ],
    }

@app.get("/api/geo")
def geo(q: str, hours: int = 24):
    """
    Aggregate by country for the keyword within the time window.
    Returns: [{ cc: ISO2, n: count, avg: avg_compound_score }, ...]
    """
    kw = normalize_keyword(q)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    sess = SessionLocal()

    agg = (
        sess.query(
            Post.country_code.label("cc"),
            func.count(Post.id).label("n"),
            func.avg(Post.sentiment_score).label("avg"),
        )
        .filter(
            Post.keyword == kw,
            Post.created_at >= cutoff,
            Post.country_code.isnot(None),
        )
        .group_by(Post.country_code)
        .all()
    )
    sess.close()

    return {
        "keyword": kw,
        "hours": hours,
        "countries": [
            {"cc": row.cc, "n": int(row.n), "avg": float(row.avg)} for row in agg
        ],
    }

@app.get("/api/insights")
def insights(q: str, hours: int = 24):
    kw = (q or "").strip().lower()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    sess = SessionLocal()
    rows = (
        sess.query(Post)
        .filter(Post.keyword == kw, Post.created_at >= cutoff)
        .order_by(Post.created_at.desc())
        .limit(120)
        .all()
    )
    sess.close()

    if not rows:
        # Return 200 + empty insights (frontend can still render a friendly message)
        return {
            "summary": "No recent posts to summarize for this window.",
            "themes": [],
            "aspects": {"price": 0, "quality": 0, "service": 0},
            "quotes": []
        }

    posts = [{
        "text": r.text,
        "sentiment_label": r.sentiment_label,
        "sentiment_score": r.sentiment_score,
        "created_at": r.created_at.isoformat(),
        "source": r.source,
        "country_code": r.country_code,
    } for r in rows]

    try:
        result = summarize_posts(kw, posts)
        return result
    except Exception as e:
        print("[insights][route-error]", repr(e))
        return {
            "summary": "Insights unavailable due to a server-side error.",
            "themes": [],
            "aspects": {"price": 0, "quality": 0, "service": 0},
            "quotes": []
        }

@app.post("/api/chat")
def chat_api(
    q: str,
    hours: int = 168,
    payload: Dict[str, Any] = Body(default={}),
):
    """
    Body shape:
      { "message": string, "history": [{role, content}] }
    Returns: { "reply": string }
    """
    keyword = (q or "").strip().lower()
    msg = (payload or {}).get("message") or ""
    history = (payload or {}).get("history") or []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    sess = SessionLocal()
    rows = (
        sess.query(Post)
        .filter(Post.keyword == keyword, Post.created_at >= cutoff)
        .order_by(Post.created_at.desc())
        .limit(120)
        .all()
    )
    sess.close()

    posts = [{
        "text": r.text,
        "sentiment_label": r.sentiment_label,
        "sentiment_score": r.sentiment_score,
        "created_at": r.created_at.isoformat(),
        "source": r.source,
        "country_code": r.country_code,
    } for r in rows]

    reply = chat_reply(keyword, posts, history, msg)
    return {"reply": reply}


@app.get("/api/health")
def health():
    return {"ok": True}
