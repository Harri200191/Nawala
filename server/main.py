import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import init_db
from routes.places import router as places_router
from routes.search import router as search_router
from routes.verdict import router as verdict_router
from routes.chat import router as chat_router
from routes.profile import router as profile_router

app = FastAPI(title="Nawala API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(places_router)
app.include_router(search_router)
app.include_router(verdict_router)
app.include_router(chat_router)
app.include_router(profile_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
