# backend/gemini_helper.py
import json
from typing import List, Dict, Any
from google import genai
from google.genai import types
from settings import GOOGLE_API_KEY

# Create a single client
_client = genai.Client(api_key=GOOGLE_API_KEY)

_SYSTEM = (
    "You are a concise analyst. Return valid JSON only. "
    "Keep it factual and short."
)

def summarize_posts(keyword: str, posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    posts: [{text, sentiment_label, sentiment_score, created_at, source}, ...]
    Returns JSON-like dict: {summary, themes[], aspects{price,quality,service}, quotes[]}
    """
    # Trim to a reasonable payload for hackathon (keep top 40)
    sample = posts[:40]

    user_prompt = f"""
Keyword: {keyword}

You are given recent social/news items (text + labels).

Tasks:
1) In <= 120 words, explain the overall sentiment and what's driving it today.
2) Extract up to 5 short theme tags (kebab-case words or short phrases).
3) Estimate aspect sentiment in range [-1,1] for price, quality, service (use 0 if unclear).
4) Provide up to 3 short representative quotes (<= 20 words) that support the summary.

Return STRICT JSON with keys:
- summary: string
- themes: string[]
- aspects: {{price: number, quality: number, service: number}}
- quotes: string[]

Items:
{json.dumps(sample, ensure_ascii=False)}
"""

    resp = _client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[types.Content(role="user", parts=[types.Part.from_text(user_prompt)])],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    # The SDK returns .text for JSON mode
    try:
        return json.loads(resp.text or "{}")
    except Exception:
        # Fallback guard
        return {
            "summary": "Could not generate insights at this time.",
            "themes": [],
            "aspects": {"price": 0, "quality": 0, "service": 0},
            "quotes": [],
        }
