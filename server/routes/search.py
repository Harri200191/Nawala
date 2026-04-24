import time
import httpx
import os
import re
from fastapi import APIRouter, Query
from db import get_conn, jsonb

router = APIRouter(prefix="/api/search", tags=["search"])

SERP_TTL = 21600   # 6 hours
SERP_API_KEY = os.getenv("SERP_API_KEY", "")
SERP_BASE = "https://serpapi.com/search"


async def _serp_search(query: str, num: int = 5, engine: str = "google") -> dict:
    params = {"q": query, "api_key": SERP_API_KEY, "num": num, "engine": engine}
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
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=%s", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"results": row["data"], "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"results": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    raw = await _serp_search(query, num=8)
    results = _extract_results(raw, limit=8)

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO search_cache(cache_key, data, fetched_at)
               VALUES(%s, %s, %s)
               ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, fetched_at=EXCLUDED.fetched_at""",
            (cache_key, jsonb(results), now),
        )

    return {"results": results, "cached": False, "fetched_at": now}


# ─── Social (Instagram/TikTok/YouTube) ───────────────────────────────────────

@router.get("/social")
async def social_search(name: str = Query(...), city: str = Query("")):
    query = f"{name} {city} instagram OR tiktok OR youtube".strip()
    cache_key = f"social:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=%s", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {"results": row["data"], "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"results": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    raw = await _serp_search(query, num=12)
    results = _extract_results(raw, limit=12)

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO search_cache(cache_key, data, fetched_at)
               VALUES(%s, %s, %s)
               ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, fetched_at=EXCLUDED.fetched_at""",
            (cache_key, jsonb(results), now),
        )

    return {"results": results, "cached": False, "fetched_at": now}


# ─── Menu (image search, sorted by recency) ──────────────────────────────────

@router.get("/menu")
async def menu_search(name: str = Query(...), city: str = Query(""), limit: int = Query(6)):
    query = f"{name} {city} menu".strip()
    cache_key = f"menu_img2:{query.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=%s", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            images = row["data"][:limit]
            return {"images": images, "cached": True, "fetched_at": row["fetched_at"]}

    if not SERP_API_KEY:
        return {"images": [], "cached": False, "fetched_at": now, "error": "SERP_API_KEY not configured"}

    params = {
        "q": query,
        "engine": "google_images",
        "api_key": SERP_API_KEY,
        "num": 20,
        "safe": "active",
        # bias towards recent results (Google's "past year" filter)
        "tbs": "qdr:y",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(SERP_BASE, params=params)
        r.raise_for_status()
        raw = r.json()

    images = []
    for img in raw.get("images_results", []):
        if not (img.get("original") and img.get("thumbnail")):
            continue
        images.append({
            "original": img.get("original", ""),
            "thumbnail": img.get("thumbnail", ""),
            "title": img.get("title", ""),
            "source": img.get("source", ""),
            "width": img.get("original_width", 0),
            "height": img.get("original_height", 0),
            "position": img.get("position", 999),
        })

    # Keep the top-ranked results from a recency-biased search; trim to limit.
    images.sort(key=lambda x: x.get("position", 999))
    images = images[:max(limit, 12)]  # store a few extras in cache, return `limit`

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO search_cache(cache_key, data, fetched_at)
               VALUES(%s, %s, %s)
               ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, fetched_at=EXCLUDED.fetched_at""",
            (cache_key, jsonb(images), now),
        )

    return {"images": images[:limit], "cached": False, "fetched_at": now}


# ─── Action Items (delivery/reservation platforms) ──────────────────────────

DELIVERY_DOMAINS = {
    "foodpanda.pk": "FoodPanda",
    "foodpanda.com": "FoodPanda",
    "foodpanda.com.pk": "FoodPanda",
    "cheetay.pk": "Cheetay",
    "ubereats.com": "Uber Eats",
    "doordash.com": "DoorDash",
    "grubhub.com": "Grubhub",
    "deliveroo.com": "Deliveroo",
    "swiggy.com": "Swiggy",
    "zomato.com": "Zomato",
    "talabat.com": "Talabat",
    "jahez.net": "Jahez",
    "hungerstation.com": "HungerStation",
}

RESERVATION_DOMAINS = {
    "opentable.com": "OpenTable",
    "resy.com": "Resy",
    "tabelog.com": "Tabelog",
    "thefork.com": "TheFork",
    "sevenrooms.com": "SevenRooms",
    "booksy.com": "Booksy",
}


def _categorize_link(url: str) -> tuple[str | None, str | None]:
    """Return (kind, platform) where kind ∈ {'order','reserve'} or (None, None)."""
    if not url:
        return None, None
    lower = url.lower()
    for domain, platform in DELIVERY_DOMAINS.items():
        if domain in lower:
            return "order", platform
    for domain, platform in RESERVATION_DOMAINS.items():
        if domain in lower:
            return "reserve", platform
    return None, None


@router.get("/actions")
async def action_items(name: str = Query(...), city: str = Query("")):
    """
    Find actionable links for this restaurant: online order, takeaway, reservation.
    Combines targeted SerpAPI queries for major platforms.
    """
    cache_key = f"actions:{name.lower()}:{city.lower()}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=%s", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < SERP_TTL:
            return {**row["data"], "cached": True}

    order_links: dict[str, dict] = {}
    reserve_links: dict[str, dict] = {}

    if SERP_API_KEY:
        queries = [
            f"{name} {city} foodpanda",
            f"{name} {city} order online delivery",
            f"{name} {city} opentable OR resy reservation",
        ]
        for q in queries:
            try:
                raw = await _serp_search(q, num=5)
            except Exception:
                continue
            for item in raw.get("organic_results", [])[:5]:
                link = item.get("link", "")
                kind, platform = _categorize_link(link)
                if not kind:
                    continue
                title = item.get("title", "")
                snippet = item.get("snippet", "")
                entry = {"platform": platform, "url": link, "title": title, "snippet": snippet}
                bucket = order_links if kind == "order" else reserve_links
                if platform not in bucket:
                    bucket[platform] = entry

    payload = {
        "order": list(order_links.values()),
        "reserve": list(reserve_links.values()),
        "fetched_at": now,
        "cached": False,
    }

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO search_cache(cache_key, data, fetched_at)
               VALUES(%s, %s, %s)
               ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, fetched_at=EXCLUDED.fetched_at""",
            (cache_key, jsonb({"order": payload["order"], "reserve": payload["reserve"], "fetched_at": now}), now),
        )

    return payload
