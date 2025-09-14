# backend/gemini_chat.py
from typing import List, Dict, Any
import json
from settings import GOOGLE_API_KEY, GEMINI_SENTIMENT_MODEL

try:
    import google.generativeai as genai
    genai.configure(api_key=GOOGLE_API_KEY or "")
except Exception:
    genai = None

SYSTEM_PROMPT = (
    "You are a helpful analyst. Answer concisely using the provided context. "
    "If something is not in the context, say you’re inferring or don’t know. "
    "Prefer grounded, practical insights. Avoid making up sources."
)

def build_context(keyword: str, posts: List[Dict[str, Any]]) -> str:
    """Compact context string from recent posts."""
    lines = [f"TOPIC: {keyword}", f"ITEMS ({len(posts)}):"]
    for p in posts[:40]:
        cc = p.get("country_code") or ""
        lab = p.get("sentiment_label") or "neutral"
        t  = (p.get("text") or "").replace("\n", " ")[:220]
        lines.append(f"- [{cc}][{lab}] {t}")
    return "\n".join(lines)

def chat_reply(keyword: str, posts: List[Dict[str, Any]],
               history: List[Dict[str, str]], user_msg: str) -> str:
    """
    history: [{role:'user'|'assistant', content:'...'}]
    returns: assistant reply string
    """
    if genai is None or not GOOGLE_API_KEY:
        return "Gemini is not configured on the server. Ask the organizer to set GOOGLE_API_KEY."

    model = genai.GenerativeModel(GEMINI_SENTIMENT_MODEL)
    # Start a chat with a short system preamble and a compact context block
    ctx = build_context(keyword, posts)
    chat = model.start_chat(history=[
        {"role": "user", "parts": SYSTEM_PROMPT},
        {"role": "user", "parts": f"Context for analysis:\n{ctx}"},
        *[{"role": m["role"], "parts": m["content"]} for m in (history or [])],
    ])

    response = chat.send_message(user_msg)
    # Classic SDK: prefer response.text
    return getattr(response, "text", "") or "Sorry, I couldn't generate a response."
