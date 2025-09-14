# backend/settings.py
import os
from dotenv import load_dotenv
load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")

# Gemini sentiment toggle + config
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
USE_GEMINI_SENTIMENT = os.getenv("USE_GEMINI_SENTIMENT", "false").lower() in ("1","true","yes")
GEMINI_SENTIMENT_MODEL = os.getenv("GEMINI_SENTIMENT_MODEL", "gemini-1.5-flash")
GEMINI_SENTIMENT_MAX_ITEMS = int(os.getenv("GEMINI_SENTIMENT_MAX_ITEMS", "60"))
