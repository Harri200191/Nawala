import json
import time
import httpx
import os
from fastapi import APIRouter, HTTPException, Query
from db import get_conn

router = APIRouter(prefix="/api/places", tags=["places"])

PLACES_TTL = 3600          # 1 hour
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"


async def _fetch_nearby(lat: float, lng: float, radius: int, keyword: str = "") -> dict:
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": "restaurant",
        "key": GOOGLE_API_KEY,
    }
    if keyword:
        params["keyword"] = keyword

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
        r.raise_for_status()
        return r.json()


async def _fetch_details(place_id: str) -> dict:
    fields = (
        "place_id,name,formatted_address,formatted_phone_number,"
        "opening_hours,rating,user_ratings_total,price_level,"
        "reviews,website,geometry,photos"
    )
    params = {"place_id": place_id, "fields": fields, "key": GOOGLE_API_KEY}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{PLACES_BASE}/details/json", params=params)
        r.raise_for_status()
        return r.json()


@router.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(2000),
    keyword: str = Query(""),
    min_rating: float = Query(0),
    price_levels: str = Query(""),
):
    cache_key = f"nearby:{lat:.4f}:{lng:.4f}:{radius}:{keyword}"
    now = int(time.time())

    with get_conn() as conn:
        row = conn.execute(
            "SELECT data, fetched_at FROM search_cache WHERE cache_key=?", (cache_key,)
        ).fetchone()
        if row and (now - row["fetched_at"]) < PLACES_TTL:
            data = json.loads(row["data"])
            data["_cached"] = True
            return data

    if not GOOGLE_API_KEY:
        return {"results": [], "status": "NO_API_KEY"}

    data = await _fetch_nearby(lat, lng, radius, keyword)

    results = data.get("results", [])
    if min_rating:
        results = [r for r in results if r.get("rating", 0) >= min_rating]
    if price_levels:
        allowed = [int(p) for p in price_levels.split(",") if p.isdigit()]
        if allowed:
            results = [r for r in results if r.get("price_level") in allowed]

    payload = {"results": results, "status": data.get("status")}

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache(cache_key, data, fetched_at) VALUES(?,?,?)",
            (cache_key, json.dumps(payload), now),
        )

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
