import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "nawala.db")


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS places_cache (
                place_id TEXT PRIMARY KEY,
                data     TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS search_cache (
                cache_key  TEXT PRIMARY KEY,
                data       TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS verdict_cache (
                place_id   TEXT PRIMARY KEY,
                verdict    TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_history (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    TEXT NOT NULL,
                place_id   TEXT NOT NULL,
                cuisine    TEXT,
                price_level INTEGER,
                rating     REAL,
                visited_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_history_user ON user_history(user_id);
        """)


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
