import json
import time
from fastapi import APIRouter
from pydantic import BaseModel
from db import get_conn

router = APIRouter(prefix="/api/profile", tags=["profile"])


class HistoryEntry(BaseModel):
    user_id: str
    place_id: str
    name: str
    cuisine: str = ""
    price_level: int = 0
    rating: float = 0.0


@router.post("/history")
async def add_history(entry: HistoryEntry):
    now = int(time.time())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO user_history(user_id, place_id, cuisine, price_level, rating, visited_at)
               VALUES(?,?,?,?,?,?)""",
            (entry.user_id, entry.place_id, entry.cuisine, entry.price_level, entry.rating, now),
        )
    return {"ok": True}


@router.get("/insights/{user_id}")
async def get_insights(user_id: str):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT cuisine, price_level, rating FROM user_history
               WHERE user_id=? ORDER BY visited_at DESC LIMIT 50""",
            (user_id,),
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
