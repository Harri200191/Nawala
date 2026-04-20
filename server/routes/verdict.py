import json
import time
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from anthropic import AsyncAnthropic
from db import get_conn

router = APIRouter(prefix="/api/verdict", tags=["verdict"])

VERDICT_TTL = 86400  # 24 hours
client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


class VerdictRequest(BaseModel):
    place_id: str
    name: str
    address: str = ""
    rating: float = 0
    price_level: int = 0
    reviews: list[str] = []
    reddit_snippets: list[str] = []


@router.post("")
async def get_verdict(req: VerdictRequest):
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT verdict, fetched_at FROM verdict_cache WHERE place_id=?", (req.place_id,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < VERDICT_TTL:
            return {"verdict": row["verdict"], "cached": True}

    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    price_map = {0: "unknown", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
    price_str = price_map.get(req.price_level, "unknown")

    google_reviews = "\n".join(f"- {r}" for r in req.reviews[:3])
    reddit_bits = "\n".join(f"- {s}" for s in req.reddit_snippets[:3])

    user_content = f"""Restaurant: {req.name}
Address: {req.address}
Google Rating: {req.rating}/5
Price Range: {price_str}

Google Reviews:
{google_reviews or 'No reviews available'}

Reddit/Web Buzz:
{reddit_bits or 'No web results available'}"""

    message = await client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        system=(
            "You are a food scout. Given this restaurant data, give a 4-line verdict covering: "
            "vibe, price, standout dish, and best time to visit. Be direct. No fluff. "
            "Format each line as: [Label]: [content]"
        ),
        messages=[{"role": "user", "content": user_content}],
    )

    verdict = message.content[0].text

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO verdict_cache(place_id, verdict, fetched_at) VALUES(?,?,?)",
            (req.place_id, verdict, now),
        )

    return {"verdict": verdict, "cached": False}
