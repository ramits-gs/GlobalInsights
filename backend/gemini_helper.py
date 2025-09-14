# backend/gemini_helper.py
import json
from typing import Any, Dict, List

from settings import GOOGLE_API_KEY, GEMINI_SENTIMENT_MODEL

_DEBUG = True
def _dbg(*a):
    if _DEBUG: print("[insights]", *a)

# ---- Classic SDK only ----
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        _dbg("google-generativeai loaded:", getattr(genai, "__version__", "?"))
    else:
        _dbg("GOOGLE_API_KEY missing")
except Exception as e:
    genai = None
    _dbg("failed to import google.generativeai:", repr(e))

def _safe_json_loads(s: str) -> Dict[str, Any]:
    try:
        return json.loads(s)
    except Exception:
        if "{" in s and "}" in s:
            try:
                return json.loads(s[s.index("{"): s.rindex("}") + 1])
            except Exception:
                return {}
        return {}

def _heuristic_insights(keyword: str, posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not posts:
        return {
            "summary": "No recent posts to summarize for this window.",
            "themes": [],
            "aspects": {"price": 0, "quality": 0, "service": 0},
            "quotes": []
        }
    pos = sum(1 for p in posts if str(p.get("sentiment_label","")).startswith("pos"))
    neg = sum(1 for p in posts if str(p.get("sentiment_label","")).startswith("neg"))
    neu = len(posts) - pos - neg
    avg = 0.0; n=0
    for p in posts:
        try: avg += float(p.get("sentiment_score") or 0); n += 1
        except: pass
    avg = (avg/n) if n else 0.0

    def _aspect(words):
        score = 0
        for p in posts:
            t = (p.get("text") or "").lower()
            hit = any(w in t for w in words)
            if hit:
                lab = p.get("sentiment_label","neutral")
                score += 1 if lab=="positive" else -1 if lab=="negative" else 0
        return max(-1.0, min(1.0, score / max(1,len(posts))))

    aspects = {
        "price": _aspect(["price","cost","expensive","cheap","afford"]),
        "quality": _aspect(["quality","reliable","buggy","performance","battery","range"]),
        "service": _aspect(["support","service","warranty","customer","shipping"]),
    }
    quotes = [{"text": (p.get("text") or "")[:140], "sentiment": p.get("sentiment_label","neutral")}
              for p in posts[:5]]
    summary = (f"For '{keyword}', we analyzed {len(posts)} items: "
               f"{pos} positive, {neg} negative, {neu} neutral. "
               f"Average sentiment ≈ {avg:.2f}.")
    return {"summary": summary, "themes": ["adoption","experience","policy"], "aspects": aspects, "quotes": quotes}

def summarize_posts(keyword: str, posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not posts:
        return _heuristic_insights(keyword, posts)

    # If classic SDK not available or no key → heuristic
    if genai is None or not GOOGLE_API_KEY:
        _dbg("Classic SDK not available or no key → heuristic")
        return _heuristic_insights(keyword, posts)

    items = [{
        "text": (p.get("text") or "")[:400],
        "sentiment": p.get("sentiment_label") or "neutral",
        "source": p.get("source") or "web",
        "country": p.get("country_code") or ""
    } for p in posts[:60]]

    schema = (
        '{'
        '"summary":"<3-5 sentences>",'
        '"themes":["<short theme>", "..."],'
        '"aspects":{"price":-1.0,"quality":-1.0,"service":-1.0},'
        '"quotes":[{"text":"<short quote>","sentiment":"positive|neutral|negative"}]'
        '}'
    )
    prompt = (
        "You are an insights engine. Analyze the items and respond ONLY as JSON.\n"
        f"TOPIC: {keyword}\n\nITEMS: {json.dumps(items, ensure_ascii=False)}\n\n"
        "Return strictly this schema (no extra text):\n" + schema
    )

    try:
        model = genai.GenerativeModel(GEMINI_SENTIMENT_MODEL)
        resp = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        )
        text = getattr(resp, "text", "") or ""
        if not text and getattr(resp, "candidates", None):
            parts = resp.candidates[0].content.parts
            if parts and getattr(parts[0], "text", None):
                text = parts[0].text

        _dbg("model:", GEMINI_SENTIMENT_MODEL, "chars:", len(text or ""))
        data = _safe_json_loads((text or "").strip())

        aspects = data.get("aspects", {})
        def _num(x):
            try: return float(x)
            except: return 0.0

        return {
            "summary": data.get("summary", "No summary available."),
            "themes": data.get("themes", []),
            "aspects": {
                "price": max(-1.0, min(1.0, _num(aspects.get("price", 0)))),
                "quality": max(-1.0, min(1.0, _num(aspects.get("quality", 0)))),
                "service": max(-1.0, min(1.0, _num(aspects.get("service", 0)))),
            },
            "quotes": data.get("quotes", []),
        }
    except Exception as e:
        _dbg("ERROR:", repr(e))
        try: _dbg("raw_response:", resp)
        except: pass
        return _heuristic_insights(keyword, posts)
