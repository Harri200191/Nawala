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

MENU_PRIORITY_DOMAINS = [
    "zomato.com", "foodpanda.com", "yelp.com", "tripadvisor.com",
    "opentable.com", "grubhub.com", "doordash.com", "seamless.com",
    "menupages.com", "allmenus.com", "menu.com", "restaurantji.com",
    "foursquare.com", "talabat.com", "deliveroo.com", "ubereats.com",
]


async def _serp_search(query: str, num: int = 5) -> dict:
    params = {"q": query, "api_key": SERP_API_KEY, "num": num, "engine": "google"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(SERP_BASE, params=params)
        r.raise_for_status()
        return r.json()


def _extract_results(raw: dict, limit: int = 5) -> list[dict]:
    organic = raw.get("organic_results", [])
    return [
        {
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("displayed_link", ""),
            "thumbnail": item.get("thumbnail") or item.get("rich_snippet", {}).get("top", {}).get("detected_extensions", {}).get("thumbnail"),
            "date": item.get("date", ""),
        }
        for item in organic[:limit]
    ]


# ─── Reddit ─────────────────────────────────────────────────────────────────

@router.get("/reddit")
async def reddit_search(name: str = Query(...), city: str = Query("")):
    query = f"{name} {city} site:reddit.com".strip()
    cache_key = f"reddit2:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"results": json.loads(row["data"]), "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"results": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    raw = await _serp_search(query, num=8)
    results = _extract_results(raw, limit=8)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(results), now),
        )

    return {"results": results, "cached": False, "fetched_at": now}


# ─── Social ──────────────────────────────────────────────────────────────────

@router.get("/social")
async def social_search(name: str = Query(...), city: str = Query("")):
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


# ─── Menu ────────────────────────────────────────────────────────────────────

@router.get("/menu")
async def menu_search(name: str = Query(...), city: str = Query("")):
    query = f"{name} {city} menu".strip()
    cache_key = f"menu_img:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"images": json.loads(row["data"]), "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"images": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    params = {
        "q": query,
        "engine": "google_images",
        "api_key": SERP_API_KEY,
        "num": 20,
        "safe": "active",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(SERP_BASE, params=params)
        r.raise_for_status()
        raw = r.json()

    images = [
        {
            "original": img.get("original", ""),
            "thumbnail": img.get("thumbnail", ""),
            "title": img.get("title", ""),
            "source": img.get("source", ""),
            "width": img.get("original_width", 0),
            "height": img.get("original_height", 0),
        }
        for img in raw.get("images_results", [])
        if img.get("original") and img.get("thumbnail")
    ]

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(images), now),
        )

    return {"images": images, "cached": False, "fetched_at": now}
