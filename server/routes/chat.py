import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic

router = APIRouter(prefix="/api/chat", tags=["chat"])
client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    user_profile: dict = {}


def _build_system(profile: dict) -> str:
    budget = profile.get("budget", "not specified")
    dietary = profile.get("dietary", "no preference")
    cuisines = ", ".join(profile.get("cuisines", [])) or "no preference"
    visited = profile.get("visited_places", [])
    visited_str = ", ".join(v.get("name", "") for v in visited[:5]) if visited else "none yet"

    return (
        "You are a food planning assistant for the Nawala app. "
        f"User preferences — Budget: {budget}, Dietary: {dietary}, "
        f"Cuisine preferences: {cuisines}, Recently visited: {visited_str}. "
        "Help them plan meals, suggest restaurants, and answer food-related questions. "
        "Be concise, friendly, and specific. Reference their preferences naturally."
    )


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    if not os.getenv("ANTHROPIC_API_KEY"):
        async def error_gen():
            yield "data: ANTHROPIC_API_KEY not configured\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    system_prompt = _build_system(req.user_profile)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def generate():
        async with client.messages.stream(
            model="claude-haiku-4-5",
            max_tokens=600,
            system=system_prompt,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                escaped = text.replace("\n", "\\n")
                yield f"data: {escaped}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
