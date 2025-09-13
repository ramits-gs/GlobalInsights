# backend/ingest.py
import requests
from datetime import datetime, timezone
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from models import Post, SessionLocal
from country_map import COUNTRY_KEYWORDS
import json

analyzer = SentimentIntensityAnalyzer()

def clean_text(txt: str) -> str:
    return " ".join(txt.split())

def infer_country(text: str) -> str | None:
    t = (" " + (text or "").lower() + " ")
    for k, iso in COUNTRY_KEYWORDS.items():
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
