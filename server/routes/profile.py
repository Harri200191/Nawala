"""
Per-user profile routes: preferences, visit history, insights.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db import get_conn, jsonb
from auth import current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


class HistoryEntry(BaseModel):
    place_id: str
    name: str = ""
    cuisine: str = ""
    price_level: int = 0
    rating: float = 0.0


class PreferencesUpdate(BaseModel):
    budget_min: int | None = None
    budget_max: int | None = None
    dietary: str | None = None
    cuisines: list[str] | None = None
    filters_json: dict | None = None


@router.post("/history")
async def add_history(entry: HistoryEntry, user: dict = Depends(current_user)):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO user_history(user_id, place_id, cuisine, price_level, rating)
               VALUES(%s, %s, %s, %s, %s)""",
            (user["id"], entry.place_id, entry.cuisine, entry.price_level, entry.rating),
        )
    return {"ok": True}


@router.get("/insights")
async def get_insights(user: dict = Depends(current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT cuisine, price_level, rating FROM user_history
               WHERE user_id=%s ORDER BY visited_at DESC LIMIT 50""",
            (user["id"],),
        ).fetchall()

    if not rows:
        return {"top_cuisines": [], "avg_price_level": 2, "avg_rating": 4.0, "visit_count": 0}

    cuisine_counts: dict[str, int] = {}
    price_sum = 0
    rating_sum = 0
    for row in rows:
        if row["cuisine"]:
            cuisine_counts[row["cuisine"]] = cuisine_counts.get(row["cuisine"], 0) + 1
        price_sum += row["price_level"] or 2
        rating_sum += row["rating"] or 4.0

    top_cuisines = sorted(cuisine_counts.items(), key=lambda x: x[1], reverse=True)[:2]
    return {
        "top_cuisines": [c[0] for c in top_cuisines],
        "avg_price_level": round(price_sum / len(rows)),
        "avg_rating": round(rating_sum / len(rows), 1),
        "visit_count": len(rows),
    }


@router.get("/preferences")
async def get_preferences(user: dict = Depends(current_user)):
    with get_conn() as conn:
        row = conn.execute(
            """SELECT budget_min, budget_max, dietary, cuisines, filters_json
               FROM user_preferences WHERE user_id=%s""",
            (user["id"],),
        ).fetchone()

    if not row:
        return {
            "budget_min": 0, "budget_max": 100, "dietary": "both",
            "cuisines": [], "filters_json": {},
        }
    return {
        "budget_min": row["budget_min"],
        "budget_max": row["budget_max"],
        "dietary": row["dietary"],
        "cuisines": row["cuisines"] or [],
        "filters_json": row["filters_json"] or {},
    }


@router.put("/preferences")
async def update_preferences(req: PreferencesUpdate, user: dict = Depends(current_user)):
    updates: list[str] = []
    params: list = []
    if req.budget_min is not None:
        updates.append("budget_min=%s"); params.append(req.budget_min)
    if req.budget_max is not None:
        updates.append("budget_max=%s"); params.append(req.budget_max)
    if req.dietary is not None:
        updates.append("dietary=%s"); params.append(req.dietary)
    if req.cuisines is not None:
        updates.append("cuisines=%s"); params.append(req.cuisines)
    if req.filters_json is not None:
        updates.append("filters_json=%s"); params.append(jsonb(req.filters_json))

    if not updates:
        return {"ok": True}

    params.append(user["id"])
    with get_conn() as conn:
        # Ensure row exists, then update
        conn.execute(
            "INSERT INTO user_preferences(user_id) VALUES(%s) ON CONFLICT DO NOTHING",
            (user["id"],),
        )
        conn.execute(
            f"UPDATE user_preferences SET {', '.join(updates)} WHERE user_id=%s",
            params,
        )
    return {"ok": True}
