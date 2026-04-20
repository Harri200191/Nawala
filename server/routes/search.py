import json
import time
import httpx
import os
from fastapi import APIRouter, Query
from db import get_conn

router = APIRouter(prefix="/api/search", tags=["search"])

SERP_TTL = 21600   # 6 hours
SERP_API_KEY = os.getenv("SERP_API_KEY", "")
SERP_BASE = "https://serpapi.com/search"


async def _serp_search(query: str) -> dict:
    params = {"q": query, "api_key": SERP_API_KEY, "num": 5, "engine": "google"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(SERP_BASE, params=params)
        r.raise_for_status()
        return r.json()


def _extract_results(raw: dict) -> list[dict]:
    organic = raw.get("organic_results", [])
    return [
        {
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("displayed_link", ""),
            "thumbnail": item.get("thumbnail", None),
        }
        for item in organic[:5]
    ]


@router.get("/reddit")
async def reddit_search(
    name: str = Query(...),
    city: str = Query(""),
):
    query = f"{name} {city} reddit".strip()
    cache_key = f"reddit:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"results": json.loads(row["data"]), "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"results": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    raw = await _serp_search(query)
    results = _extract_results(raw)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(results), now),
        )

    return {"results": results, "cached": False, "fetched_at": now}


@router.get("/social")
async def social_search(
    name: str = Query(...),
    city: str = Query(""),
):
    query = f"{name} {city} instagram OR tiktok OR facebook".strip()
    cache_key = f"social:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"results": json.loads(row["data"]), "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"results": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    raw = await _serp_search(query)
    results = _extract_results(raw)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(results), now),
        )

    return {"results": results, "cached": False, "fetched_at": now}
