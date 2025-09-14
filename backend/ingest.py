# backend/ingest.py
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Iterable, Dict, Any, List, Optional

import requests
from nltk.sentiment.vader import SentimentIntensityAnalyzer

from country_map import COUNTRY_KEYWORDS
from models import Post, SessionLocal
from settings import (
    YOUTUBE_API_KEY,
    NEWSAPI_KEY,
    GOOGLE_API_KEY,
    USE_GEMINI_SENTIMENT,
    GEMINI_SENTIMENT_MODEL,
    GEMINI_SENTIMENT_MAX_ITEMS,
)

# Try to initialize Gemini client if key present (optional)
try:
    from google import genai
    from google.genai import types as genai_types
    _gemini_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None
except Exception:
    _gemini_client = None

# ---------------------------
# Helpers (text + sentiment)
# ---------------------------
analyzer = SentimentIntensityAnalyzer()

URL_RE = re.compile(r"https?://\S+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]+")

def clean_text(txt: Optional[str]) -> str:
    """Basic cleaner used before sentiment; keeps punctuation minimal."""
    return " ".join((txt or "").split())

def _normalize_for_match(txt: Optional[str]) -> str:
    """Normalize for matching country keywords (lowercase, strip URLs/punct, collapse spaces)."""
    t = (txt or "").lower().replace("’", "'")
    t = URL_RE.sub(" ", t)
    t = NON_ALNUM_RE.sub(" ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return f" {t} "

def infer_country(text: Optional[str]) -> Optional[str]:
    t = _normalize_for_match(text)
    for k, iso in COUNTRY_KEYWORDS.items():  # keys lowercase in country_map.py
        if f" {k} " in t:
            return iso
    return None

# ---- Sentiment engines ----
def analyze_sentiment_vader(text: str) -> tuple[float, str]:
    scores = analyzer.polarity_scores(text or "")
    comp = scores["compound"]
    if comp >= 0.05:
        label = "positive"
    elif comp <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return comp, label

_gemini_calls = 0  # simple per-process cap

def analyze_sentiment_gemini(text: str) -> tuple[float, str]:
    """
    Ask Gemini to classify sentiment and give a score in [-1,1].
    Falls back to VADER on any error or when over the per-process cap.
    """
    global _gemini_calls
    if not (_gemini_client and GOOGLE_API_KEY):
        return analyze_sentiment_vader(text)
    if _gemini_calls >= max(0, int(GEMINI_SENTIMENT_MAX_ITEMS or 0)):
        return analyze_sentiment_vader(text)

    prompt = (
        "Classify the sentiment of the text as one of: positive, neutral, negative. "
        "Also provide a real-valued score in [-1,1] (negative numbers = negative). "
        'Return STRICT JSON: {"label":"positive|neutral|negative","score": <number>}.\n'
        f"Text: {text!r}"
    )
    try:
        resp = _gemini_client.models.generate_content(
            model=GEMINI_SENTIMENT_MODEL,
            contents=[genai_types.Content(role="user", parts=[genai_types.Part.from_text(prompt)])],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        _gemini_calls += 1
        data = json.loads((resp.text or "{}").strip())
        score = float(data.get("score", 0.0))
        label = str(data.get("label", "neutral")).lower()
        if label not in ("positive", "neutral", "negative"):
            return analyze_sentiment_vader(text)
        score = max(-1.0, min(1.0, score))  # clamp
        return score, label
    except Exception:
        return analyze_sentiment_vader(text)

def analyze_sentiment_auto(text: str) -> tuple[float, str]:
    """Router: use Gemini if enabled+available; otherwise VADER."""
    if USE_GEMINI_SENTIMENT and _gemini_client:
        return analyze_sentiment_gemini(text)
    return analyze_sentiment_vader(text)

def _parse_iso(dt: Optional[str]) -> datetime:
    """Parse ISO timestamps; fallback to now (UTC)."""
    if not dt:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

# ---------------------------
# YouTube (Data API v3)
# ---------------------------
def _yt_search_video_ids(keyword: str, max_results: int = 5) -> List[str]:
    if not YOUTUBE_API_KEY:
        return []
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "key": YOUTUBE_API_KEY,
        "q": keyword,
        "type": "video",
        "part": "id",
        "order": "date",
        "maxResults": str(max_results),
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        return [it["id"]["videoId"] for it in r.json().get("items", [])]
    except Exception:
        return []

def _yt_top_comments(video_id: str, max_results: int = 20) -> List[Dict[str, Any]]:
    if not YOUTUBE_API_KEY:
        return []
    url = "https://www.googleapis.com/youtube/v3/commentThreads"
    params = {
        "key": YOUTUBE_API_KEY,
        "part": "snippet",
        "videoId": video_id,
        "maxResults": str(max_results),
        "order": "relevance",
        "textFormat": "plainText",
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        out: List[Dict[str, Any]] = []
        for item in r.json().get("items", []):
            s = item["snippet"]["topLevelComment"]["snippet"]
            out.append({
                "id": f"yt_{item['id']}",
                "source": "youtube",
                "author": s.get("authorDisplayName") or "anon",
                "text": s.get("textDisplay") or "",
                "created_at": s.get("publishedAt"),
            })
        return out
    except Exception:
        return []

def iter_youtube_live(keyword: str) -> Iterable[Dict[str, Any]]:
    for vid in _yt_search_video_ids(keyword, max_results=5):
        for c in _yt_top_comments(vid, max_results=20):
            yield c

# ---------------------------
# News (NewsAPI)
# ---------------------------
def iter_news_newsapi(keyword: str, page_size: int = 30) -> Iterable[Dict[str, Any]]:
    if not NEWSAPI_KEY:
        return []
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": keyword,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": str(page_size),
        "apiKey": NEWSAPI_KEY,
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        for a in r.json().get("articles", []):
            title = a.get("title") or ""
            desc = a.get("description") or ""
            content = f"{title}. {desc}".strip()
            if not content:
                continue
            uid = "nw_" + hashlib.md5((a.get("url") or content).encode("utf-8")).hexdigest()
            yield {
                "id": uid,
                "source": "news",
                "author": (a.get("source") or {}).get("name") or "news",
                "text": content,
                "created_at": a.get("publishedAt") or datetime.now(timezone.utc).isoformat(),
            }
    except Exception:
        return []

# ---------------------------
# Ingest into DB (live + sample)
# ---------------------------
def _score_with_engine(text: str, engine_choice: str) -> tuple[float, str]:
    if engine_choice == "gemini":
        return analyze_sentiment_gemini(text)
    if engine_choice == "vader":
        return analyze_sentiment_vader(text)
    return analyze_sentiment_auto(text)  # "auto" or anything else

def ingest_live(keyword: str, items: Iterable[Dict[str, Any]], engine_choice: str = "auto"):
    """Upsert a batch of items (any source) into the DB with sentiment + country."""
    sess = SessionLocal()
    for it in items:
        text = clean_text(it.get("text", ""))
        if not text:
            continue
        score, label = _score_with_engine(text, engine_choice)
        cc = infer_country(text)
        created_dt = _parse_iso(it.get("created_at"))

        p = Post(
            id=it.get("id"),
            keyword=keyword,
            source=it.get("source", "web"),
            author=it.get("author", "anon"),
            text=text,
            created_at=created_dt,
            sentiment_score=score,
            sentiment_label=label,
            country_code=cc,
        )
        sess.merge(p)  # upsert by primary key
    sess.commit()
    sess.close()

def ingest_sample(keyword: str, path: str = "sample_data.json", engine_choice: str = "auto"):
    """Load sample JSON, run sentiment + country, and upsert into DB."""
    sess = SessionLocal()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        text = clean_text(item.get("text", ""))
        if not text:
            continue
        score, label = _score_with_engine(text, engine_choice)
        cc = infer_country(text)
        created_dt = _parse_iso(item.get("created_at"))
        p = Post(
            id=item.get("id"),
            keyword=keyword,
            source=item.get("source", "sample"),
            author=item.get("author", "anon"),
            text=text,
            created_at=created_dt,
            sentiment_score=score,
            sentiment_label=label,
            country_code=cc,
        )
        sess.merge(p)
    sess.commit()
    sess.close()
