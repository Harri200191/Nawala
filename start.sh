#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Starting Nawala..."

# Database (Docker)
if command -v docker >/dev/null 2>&1; then
  if ! docker compose ps --status running postgres 2>/dev/null | grep -q postgres; then
    echo "  → Starting Postgres + Adminer (docker compose up -d)"
    (cd "$ROOT" && docker compose up -d)
  else
    echo "  → Postgres already running"
  fi
else
  echo "  ⚠ Docker not found — skipping DB bring-up. Ensure PostgreSQL is reachable at the URL in server/.env."
fi

# Backend
echo "  → FastAPI server on :3001"
cd "$ROOT"
source "$ROOT/venv/bin/activate"
cd "$ROOT/server"
uvicorn main:app --host 0.0.0.0 --port 3001 --reload &
BACKEND_PID=$!

# Frontend
echo "  → Vite dev server on :5173"
cd "$ROOT/client"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Nawala running at http://localhost:5173"
echo "  API docs at     http://localhost:3001/docs"
echo ""
echo "  Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
