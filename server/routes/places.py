import asyncio
import json
import time
import httpx
import os
from fastapi import APIRouter, HTTPException, Query
from db import get_conn

router = APIRouter(prefix="/api/places", tags=["places"])

PLACES_TTL = 3600
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
PLACES_BASE = "https://maps.googleapis.com/maps/api/place"
GEO_BASE = "https://maps.googleapis.com/maps/api/geocode"

# --------------------------------------------------------------------------- #
#  Internal helpers                                                             #
# --------------------------------------------------------------------------- #

async def _nearby_page(params: dict) -> dict:
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
        r.raise_for_status()
        return r.json()


async def _text_search_page(params: dict) -> dict:
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(f"{PLACES_BASE}/textsearch/json", params=params)
        r.raise_for_status()
        return r.json()


async def _fetch_all_nearby(lat: float, lng: float, radius: int, keyword: str = "") -> list[dict]:
    """
    Paginate through up to 3 pages of Nearby Search (max 60 results).
    When a keyword is given, TextSearch is used for the first page because
    it ranks by relevance rather than proximity — substantially more accurate.
    """
    all_results: list[dict] = []
    seen_ids: set[str] = set()

    if keyword:
        # TextSearch gives much better keyword accuracy
        first_params = {
            "query": f"{keyword} restaurant",
            "location": f"{lat},{lng}",
            "radius": radius,
            "key": GOOGLE_API_KEY,
        }
        first_data = await _text_search_page(first_params)
    else:
        first_params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "rankby": "prominence",
            "type": "restaurant",
            "key": GOOGLE_API_KEY,
        }
        first_data = await _nearby_page(first_params)

    for r in first_data.get("results", []):
        pid = r.get("place_id")
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            all_results.append(r)

    next_token = first_data.get("next_page_token")

    # Fetch up to 2 more pages
    for _ in range(2):
        if not next_token:
            break
        # Google requires a short delay before the token becomes valid
        await asyncio.sleep(2)
        page_params = {"pagetoken": next_token, "key": GOOGLE_API_KEY}
        page_data = await _nearby_page(page_params)
        for r in page_data.get("results", []):
            pid = r.get("place_id")
            if pid and pid not in seen_ids:
                seen_ids.add(pid)
                all_results.append(r)
        next_token = page_data.get("next_page_token")

    return all_results


async def _fetch_details(place_id: str) -> dict:
    fields = (
        "place_id,name,formatted_address,formatted_phone_number,"
        "opening_hours,rating,user_ratings_total,price_level,"
        "reviews,website,geometry,photos,international_phone_number,"
        "adr_address,editorial_summary"
    )
    params = {"place_id": place_id, "fields": fields, "key": GOOGLE_API_KEY}
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(f"{PLACES_BASE}/details/json", params=params)
        r.raise_for_status()
        return r.json()


async def _reverse_geocode(lat: float, lng: float) -> dict:
    """Return country_code + currency hint from coordinates."""
    params = {
        "latlng": f"{lat},{lng}",
        "result_type": "country",
        "key": GOOGLE_API_KEY,
    }
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(f"{GEO_BASE}/json", params=params)
        r.raise_for_status()
        data = r.json()

    country_code = ""
    country_name = ""
    for result in data.get("results", []):
        for comp in result.get("address_components", []):
            if "country" in comp.get("types", []):
                country_code = comp.get("short_name", "")
                country_name = comp.get("long_name", "")
                break
        if country_code:
            break

    return {"country_code": country_code, "country_name": country_name}


# --------------------------------------------------------------------------- #
#  Routes                                                                       #
# --------------------------------------------------------------------------- #

@router.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(2000),
    keyword: str = Query(""),
    min_rating: float = Query(0),
    price_levels: str = Query(""),
    open_now: bool = Query(False),
):
    cache_key = f"nearby2:{lat:.4f}:{lng:.4f}:{radius}:{keyword}:{open_now}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < PLACES_TTL:
            payload = json.loads(row["data"])
            payload["_cached"] = True
            # Apply runtime filters even on cached data
            results = payload.get("results", [])
            if min_rating:
                results = [r for r in results if r.get("rating", 0) >= min_rating]
            if price_levels:
                allowed = [int(p) for p in price_levels.split(",") if p.isdigit()]
                if allowed:
                    results = [r for r in results if r.get("price_level") in allowed]
            payload["results"] = results
            return payload

    if not GOOGLE_API_KEY:
        return {"results": [], "status": "NO_API_KEY"}

    results = await _fetch_all_nearby(lat, lng, radius, keyword)

    if open_now:
        results = [r for r in results if r.get("opening_hours", {}).get("open_now")]

    # Sort by rating × log(review_count) — balances quality vs popularity
    import math
    def _score(r):
        rating = r.get("rating") or 0
        count = r.get("user_ratings_total") or 1
        return rating * math.log1p(count)

    results.sort(key=_score, reverse=True)

    payload = {"results": results, "status": "OK", "total": len(results)}

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(payload), now),
        )

    # Apply rating / price filters AFTER caching (don't bake volatile filters into cache)
    if min_rating:
        results = [r for r in results if r.get("rating", 0) >= min_rating]
    if price_levels:
        allowed = [int(p) for p in price_levels.split(",") if p.isdigit()]
        if allowed:
            results = [r for r in results if r.get("price_level") in allowed]

    payload["results"] = results
    return payload


@router.get("/details/{place_id}")
async def details(place_id: str):
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM places_cache WHERE place_id=?", (place_id,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < PLACES_TTL:
            data = json.loads(row["data"])
            data["_cached"] = True
            return data

    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="Google API key not configured")

    data = await _fetch_details(place_id)
    result = data.get("result", {})

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO places_cache(place_id, data, fetched_at) VALUES(?,?,?)",
            (place_id, json.dumps(result), now),
        )

    return result


@router.get("/geocode")
async def geocode(lat: float = Query(...), lng: float = Query(...)):
    """Returns country_code for currency resolution on the frontend."""
    cache_key = f"geocode:{lat:.3f}:{lng:.3f}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < 86400:  # 24-hr cache
            return json.loads(row["data"])

    if not GOOGLE_API_KEY:
        return {"country_code": "", "country_name": ""}

    result = await _reverse_geocode(lat, lng)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(result), now),
        )

    return result
