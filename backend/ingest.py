# backend/ingest.py
import requests
from datetime import datetime, timezone
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from models import Post, SessionLocal
from country_map import COUNTRY_KEYWORDS
import json
# backend/ingest.py (add near top)
import re

analyzer = SentimentIntensityAnalyzer()

URL_RE = re.compile(r"https?://\S+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]+")

def clean_text(txt: str) -> str:
    """Basic cleaner for sentiment (keeps punctuation)."""
    return " ".join((txt or "").split())

def _normalize_for_match(txt: str) -> str:
    """Strips URLs, punctuation, fancy apostrophes; lowercases; collapses spaces."""
    t = (txt or "").lower().replace("’", "'")
    t = URL_RE.sub(" ", t)
    t = NON_ALNUM_RE.sub(" ", t)        # turn punctuation into spaces
    t = re.sub(r"\s+", " ", t).strip()
    return f" {t} "                     # pad with spaces for exact token hits

def infer_country(text: str) -> str | None:
    from country_map import COUNTRY_KEYWORDS
    t = _normalize_for_match(text)
    for k, iso in COUNTRY_KEYWORDS.items():  # keys are already lowercase
        if f" {k} " in t:
            return iso
    return None


def analyze_sentiment(text: str) -> tuple[float, str]:
    scores = analyzer.polarity_scores(text)
    comp = scores["compound"]
    if comp >= 0.05: label = "positive"
    elif comp <= -0.05: label = "negative"
    else: label = "neutral"
    return comp, label

def ingest_sample(keyword: str, path: str = "sample_data.json"):
    sess = SessionLocal()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        text = clean_text(item["text"])
        score, label = analyze_sentiment(text)
        cc = infer_country(text)
        p = Post(
            id=item["id"],
            keyword=keyword,
            source=item.get("source", "sample"),
            author=item.get("author", "anon"),
            text=text,
            created_at=datetime.fromisoformat(item["created_at"]),
            sentiment_score=score,
            sentiment_label=label,
            country_code=cc,
        )
        sess.merge(p)
    sess.commit()
    sess.close()
