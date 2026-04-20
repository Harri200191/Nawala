#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Starting Nawala..."

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
