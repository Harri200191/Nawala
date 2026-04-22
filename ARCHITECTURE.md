# Nawala — Architecture Reference

> Developer-facing documentation covering every layer of the system: frontend components, backend routes, database schema, caching strategy, AI integration, and external APIs.

---

## 1. Project Overview & Purpose

Nawala is a local restaurant discovery app centred on a dark-themed interactive map. Users get nearby restaurants pulled from Google Places, filtered by radius/rating/cuisine/price. Clicking a pin opens a detail drawer with:

- Google reviews and place metadata
- Reddit and social web buzz (via SerpAPI)
- An AI-generated 4-line verdict (via Groq / LLaMA)

A floating chatbot (also Groq-powered) acts as a personal food-planning assistant, aware of the user's profile and visit history. A "For You" strip on the map surface shows personalised picks based on saved cuisine preferences.

The backend is a thin FastAPI proxy layer that shields API keys, applies SQLite-based caching to avoid redundant external calls, and persists visit history for pattern recognition.

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.5 | UI framework |
| Vite | 8.0.9 | Build tool & dev server |
| Tailwind CSS | 4.2.2 | Utility-first styling |
| `@vitejs/plugin-react` | 6.0.1 | Fast Refresh + JSX transform |
| Google Maps JS API | (CDN, runtime) | Interactive map & markers |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.13 | Runtime |
| FastAPI | 0.136.0 | HTTP framework & OpenAPI docs |
| Uvicorn | 0.44.0 | ASGI server |
| Pydantic | 2.13.3 | Request/response validation |
| httpx | 0.28.1 | Async HTTP client for external APIs |
| groq | 1.2.0 | Official Groq SDK (LLaMA inference) |
| python-dotenv | 1.2.2 | `.env` loading |
| SQLite | stdlib | Caching + history persistence |
| Starlette | 1.0.0 | ASGI foundation (ships with FastAPI) |

---

## 3. Directory Tree

```
Nawala/
├── start.sh                    # One-command launcher: starts uvicorn + vite in parallel
├── venv/                       # Python 3.13 virtual environment (not committed)
│
├── server/
│   ├── main.py                 # FastAPI app factory: CORS, router registration, startup hook
│   ├── db.py                   # SQLite connection context manager + init_db()
│   ├── nawala.db               # SQLite file created at runtime
│   ├── .env.example            # Template for server-side secrets
│   └── routes/
│       ├── __init__.py         # Empty package marker
│       ├── places.py           # /api/places — nearby search + place details (Google Places)
│       ├── search.py           # /api/search — Reddit & social web results (SerpAPI)
│       ├── verdict.py          # /api/verdict — AI 4-line restaurant verdict (Groq)
│       ├── chat.py             # /api/chat/stream — SSE chat stream (Groq)
│       └── profile.py          # /api/profile — visit history writes + insight aggregation
│
└── client/
    ├── package.json            # NPM manifest with React 19 + Vite 8 + Tailwind 4
    ├── vite.config.js          # Vite config: React plugin, Tailwind plugin, /api proxy
    ├── .env.example            # Template for VITE_GOOGLE_MAPS_API_KEY
    └── src/
        ├── App.jsx             # Root component: state orchestration, layout, geolocation
        ├── components/
        │   ├── MapView.jsx         # Google Maps canvas, marker rendering, pin click handler
        │   ├── FilterSidebar.jsx   # Collapsible filter panel (radius, rating, cuisine, price, calories)
        │   ├── DetailDrawer.jsx    # Right-side panel with 4 tabs: Overview / Reddit / Social / AI Verdict
        │   ├── Chatbot.jsx         # Fixed floating chat widget with SSE streaming
        │   ├── ForYouSection.jsx   # Horizontal card strip overlaid on map; personalised picks
        │   └── VerdictCard.jsx     # Renders the Groq verdict with label:value line parsing
        ├── hooks/
        │   ├── usePlaces.js        # Fetches /api/places/nearby; manages abort controller per call
        │   └── useUserProfile.js   # localStorage profile CRUD + dual-write to /api/profile/history
        └── utils/
            ├── claudeApi.js        # fetchVerdict() + streamChat() async generator (SSE parser)
            └── serpApi.js          # fetchRedditResults() + fetchSocialResults() thin wrappers
```

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
App
├── <header>              (search bar, place count badge, location error)
├── FilterSidebar         (props: filters, onChange, collapsed, onToggle)
├── MapView               (props: places, onPlaceSelect, selectedPlaceId, userLocation, filters)
├── ForYouSection         (props: userLocation, userProfile, onPlaceSelect, selectedPlaceId)
├── DetailDrawer          (props: place, onClose, onVisited, city) — rendered conditionally
│   ├── OverviewTab       (internal; renders place name, address, hours, reviews, "Mark Visited")
│   ├── SearchTab         (internal; type="reddit"|"social"; fetches serpApi utils on mount)
│   └── VerdictCard       (component; fetches /api/verdict on mount via claudeApi.fetchVerdict)
└── Chatbot               (props: userProfile — floating widget, always mounted)
```

### 4.2 State Owned by App

| State variable | Type | Description |
|---|---|---|
| `filters` | object | All active filter values (see DEFAULT_FILTERS below) |
| `sidebarCollapsed` | boolean | Whether FilterSidebar is collapsed to icon strip |
| `selectedPlace` | object \| null | Place object passed to DetailDrawer |
| `searchQuery` | string | Current text in the search input |
| `userLocation` | `{lat, lng}` \| null | Resolved from browser Geolocation API |
| `locationError` | string \| null | Shown in header if geolocation fails |

**DEFAULT_FILTERS shape:**
```js
{
  radius: 2000,          // metres
  minRating: 0,          // 0–5
  dietary: 'both',       // 'both' | 'veg' | 'non-veg'
  cuisines: [],          // array of cuisine strings
  budget: [0, 100],      // dual-range, display only (not sent to API)
  priceLevels: [],       // array of Google price_level integers (1–4)
  caloriesEnabled: false,
  calories: [0, 2000],   // display only
}
```

### 4.3 Custom Hooks

**`usePlaces()`** — `src/hooks/usePlaces.js`

- Exposes: `{ places, loading, error, fetchNearby }`
- `fetchNearby` is memoised with `useCallback`; each call aborts the previous in-flight request via `AbortController`
- Maps `min_rating` and `price_levels` (comma-joined) as query params to `/api/places/nearby`
- Sets `places = []` on error; does not throw

**`useUserProfile()`** — `src/hooks/useUserProfile.js`

- Exposes: `{ profile, updateProfile, addVisited }`
- Profile is loaded from `localStorage` key `nawala_profile` on first render
- `updateProfile(updates)` merges into profile and immediately writes back to localStorage
- `addVisited(place)` deduplicates locally (by `place_id`), keeps last 50 visited, then POSTs to `/api/profile/history` (failures are silently ignored — local state is source of truth)

### 4.4 Data Flow: Filter Change

```
User moves radius slider
  → FilterSidebar.onChange({ radius: 3000 })
    → App.handleFilterChange merges into filters state
    → App.updateProfile saves new filters to localStorage
    → App.fetchNearby called immediately with new params
      → usePlaces fetches /api/places/nearby
        → places state updates
          → MapView re-renders markers
```

### 4.5 Data Flow: Search Input

```
User types in search bar
  → 500ms debounce (searchDebounceRef)
    → fetchNearby({ keyword: "pizza Desi", ...filters })
      → places state updated → markers re-rendered
```

Cuisine filter tags are concatenated with the text query into a single `keyword` string before the API call.

### 4.6 MapView Details

- Google Maps JS SDK is loaded lazily via a `<script>` tag injected into `document.head` using `VITE_GOOGLE_MAPS_API_KEY`
- Map is initialised in a `useEffect` only once (`mapInstanceRef.current` guard)
- Markers are cleared and redrawn on every `places` change
- Pin colour encodes `price_level` via `PRICE_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#ef4444']`
- Selected pin is orange (`#f97316`), scale 14 vs 10, z-index 100
- Falls back to a plain list of buttons if `VITE_GOOGLE_MAPS_API_KEY` is absent

### 4.7 Chatbot Details

- Chat history is persisted in `localStorage` key `nawala_chat_history`, capped at 20 messages
- Calls `streamChat()` from `claudeApi.js` which is an `async generator` that reads the SSE response body via `ReadableStream`; each yielded chunk is appended to the in-progress assistant message
- `userProfile` (budget, dietary, cuisines, last 5 visited) is serialised into the POST body so the server can build a personalised system prompt
- "Plan my week" and "Tonight?" quick-action buttons auto-send canned messages

---

## 5. Backend Architecture

### 5.1 App Factory — `server/main.py`

- Creates `FastAPI(title="Nawala API", version="1.0.0")`
- Adds CORS middleware allowing `http://localhost:5173` (Vite dev) and `http://localhost:4173` (Vite preview)
- Registers five routers: `places`, `search`, `verdict`, `chat`, `profile`
- On startup event calls `init_db()` which creates all tables with `IF NOT EXISTS`
- Exposes `GET /api/health` → `{"status": "ok"}`

### 5.2 Database — `server/db.py`

- `DB_PATH` resolves to `server/nawala.db` relative to the file (portable)
- `get_conn()` is a `@contextmanager` that opens a connection with `row_factory = sqlite3.Row` (allows column-name access), commits on success, closes in `finally`
- `init_db()` runs a single `executescript` to create all five tables transactionally

### 5.3 Route Modules

#### `routes/places.py` — prefix `/api/places`

Handles all Google Places API interaction. Two private async helpers (`_fetch_nearby`, `_fetch_details`) are separated from the route handlers so the cache check happens before any I/O.

**Nearby fields requested from Google:** `nearbysearch` returns the full standard result set (name, geometry, rating, price_level, photos, vicinity, place_id, user_ratings_total).

**Details fields requested:** `place_id, name, formatted_address, formatted_phone_number, opening_hours, rating, user_ratings_total, price_level, reviews, website, geometry, photos`

#### `routes/search.py` — prefix `/api/search`

SerpAPI proxy. Both endpoints (`/reddit`, `/social`) share the same `_serp_search` / `_extract_results` logic. The query strings differ:
- Reddit: `"{name} {city} reddit"`
- Social: `"{name} {city} instagram OR tiktok OR facebook"`

Returns top 5 organic results with title, link, snippet, source domain, and thumbnail.

#### `routes/verdict.py` — prefix `/api/verdict`

Accepts a POST with place metadata and review snippets. Builds a structured prompt, calls Groq with `max_tokens=300`, and caches the text verdict by `place_id` for 24 hours.

#### `routes/chat.py` — prefix `/api/chat`

Single endpoint: `POST /stream`. Builds a system prompt from the user profile dict, then calls Groq with `stream=True`. Yields SSE frames (`data: {chunk}\n\n`), escaping embedded newlines as `\n`. Terminates with `data: [DONE]\n\n`.

#### `routes/profile.py` — prefix `/api/profile`

Two endpoints: one to record a visit, one to return aggregated insights. Insights are computed on the fly from the last 50 history rows — no materialised view.

---

## 6. SQLite Schema

Database file: `server/nawala.db`

### Table: `places_cache`

Stores full Google Place Details responses, keyed by `place_id`.

```sql
CREATE TABLE IF NOT EXISTS places_cache (
    place_id   TEXT PRIMARY KEY,
    data       TEXT NOT NULL,       -- JSON blob of the /details result
    fetched_at INTEGER NOT NULL     -- Unix timestamp
);
```

TTL: **3600 seconds (1 hour)**

### Table: `search_cache`

Stores both nearby search results and SerpAPI results. The cache key distinguishes them by prefix.

```sql
CREATE TABLE IF NOT EXISTS search_cache (
    cache_key  TEXT PRIMARY KEY,    -- e.g. "nearby:24.8607:67.0011:2000:pizza"
    data       TEXT NOT NULL,       -- JSON blob
    fetched_at INTEGER NOT NULL
);
```

Cache key formats:
- Nearby: `nearby:{lat:.4f}:{lng:.4f}:{radius}:{keyword}`
- Reddit: `reddit:{name} {city} reddit` (lowercased)
- Social: `social:{name} {city} instagram OR tiktok OR facebook` (lowercased)

TTL: **3600 seconds (1 hour)** for nearby, **21600 seconds (6 hours)** for SerpAPI results

### Table: `verdict_cache`

Stores Groq-generated verdict text, keyed by `place_id`.

```sql
CREATE TABLE IF NOT EXISTS verdict_cache (
    place_id   TEXT PRIMARY KEY,
    verdict    TEXT NOT NULL,       -- Raw LLM output string
    fetched_at INTEGER NOT NULL
);
```

TTL: **86400 seconds (24 hours)**

### Table: `user_history`

Append-only log of every "Mark as Visited" action. Used exclusively for insight aggregation.

```sql
CREATE TABLE IF NOT EXISTS user_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,      -- UUID generated client-side, persisted in localStorage
    place_id     TEXT NOT NULL,
    cuisine      TEXT,               -- From profile.cuisines[0] at time of visit
    price_level  INTEGER,
    rating       REAL,
    visited_at   INTEGER NOT NULL    -- Unix timestamp
);

CREATE INDEX IF NOT EXISTS idx_history_user ON user_history(user_id);
```

No TTL — records are permanent. The insights query caps at the most recent 50 rows.

### Cache TTL Summary

| Resource | Table | TTL |
|---|---|---|
| Google Place Details | `places_cache` | 1 hour |
| Google Nearby Search | `search_cache` | 1 hour |
| SerpAPI Reddit results | `search_cache` | 6 hours |
| SerpAPI Social results | `search_cache` | 6 hours |
| Groq AI Verdict | `verdict_cache` | 24 hours |
| User history | `user_history` | Permanent |

---

## 7. Data Flow Walkthroughs

### 7.1 App Load

```
1. React mounts; useUserProfile() reads localStorage → profile state initialised
   (If no key exists, DEFAULT_PROFILE with a fresh crypto.randomUUID() is written)

2. Chatbot loads localStorage chat history (nawala_chat_history, capped at 20 msgs)

3. navigator.geolocation.getCurrentPosition fires (8s timeout)
   → Success: userLocation = { lat, lng }
   → Failure / unsupported: userLocation = { lat: 24.8607, lng: 67.0011 } (Karachi default)

4. useEffect on [userLocation, filters.*] triggers fetchNearby()
   → GET /api/places/nearby?lat=…&lng=…&radius=2000&keyword=&min_rating=0&price_levels=
   → Backend checks search_cache; on miss → Google Places nearbysearch → cache write
   → places[] populated; MapView renders markers

5. ForYouSection useEffect fires with userLocation
   → GET /api/places/nearby?keyword={cuisines[0]}&min_rating=3.5&radius=3000
   → Renders horizontal card strip of up to 10 personalised results
```

### 7.2 Clicking a Map Pin

```
1. marker click listener fires → onPlaceSelect(place) → App.selectedPlace = place

2. DetailDrawer renders with the nearby-result object (has name, rating, etc.)

3. useEffect on [place.place_id] fires inside DetailDrawer
   → GET /api/places/details/{place_id}
   → Backend checks places_cache; on miss → Google Places Details → cache write
   → details state set; OverviewTab re-renders with enriched data (phone, hours, reviews, website)

4. DetailDrawer renders photo header using:
   https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=…&key=…

5. User clicks "Reddit" tab → SearchTab mounts with type="reddit"
   → fetchRedditResults(name, city) → GET /api/search/reddit?name=…&city=…
   → Backend checks search_cache (6h TTL); on miss → SerpAPI → cache write
   → ResultCard links rendered

6. User clicks "AI Verdict" tab → VerdictCard mounts
   → fetchVerdict({placeId, name, rating, priceLevel, reviews, redditSnippets})
   → POST /api/verdict
   → Backend checks verdict_cache (24h TTL); on miss:
       Builds prompt with restaurant metadata + review excerpts
       Calls Groq llama-3.1-8b-instant (max_tokens=300)
       Caches verdict text → returns to client
   → VerdictCard parses "Label: content" lines and renders them

7. User clicks "Mark as Visited"
   → onVisited(place) in App → addVisited from useUserProfile
   → Deduplication check; profile.visited_places prepended; localStorage written
   → POST /api/profile/history (fire-and-forget; failures silently swallowed)
```

### 7.3 Using the Chatbot

```
1. User opens chat (floating button) → Chatbot panel renders; input focused

2. User types message → sendMessage()
   → userMsg appended to messages state
   → POST /api/chat/stream with { messages: [...history], user_profile: {...} }
   → Backend builds personalised system prompt from user_profile fields
   → Groq streaming call; backend yields SSE chunks

3. Client claudeApi.streamChat() is an async generator:
   → ReadableStream reader chunks decoded; split on \n; data: prefix stripped
   → [DONE] sentinel terminates loop
   → Each chunk yielded; Chatbot accumulates into assistantMsg.content in real-time

4. On stream end, final message is written to localStorage (capped at 20 messages)
```

---

## 8. API Endpoints

| Method | Path | Key Params | Response | Cache |
|---|---|---|---|---|
| GET | `/api/health` | — | `{"status":"ok"}` | None |
| GET | `/api/places/nearby` | `lat`, `lng`, `radius`, `keyword`, `min_rating`, `price_levels` | `{results:[], status, _cached?}` | `search_cache`, 1h |
| GET | `/api/places/details/{place_id}` | — | Google Place detail object + `_cached?` | `places_cache`, 1h |
| GET | `/api/search/reddit` | `name`, `city` | `{results:[], cached, fetched_at}` | `search_cache`, 6h |
| GET | `/api/search/social` | `name`, `city` | `{results:[], cached, fetched_at}` | `search_cache`, 6h |
| POST | `/api/verdict` | Body: `VerdictRequest` | `{verdict: string, cached: bool}` | `verdict_cache`, 24h |
| POST | `/api/chat/stream` | Body: `ChatRequest` | `text/event-stream` SSE | None |
| POST | `/api/profile/history` | Body: `HistoryEntry` | `{"ok": true}` | None |
| GET | `/api/profile/insights/{user_id}` | — | `{top_cuisines, avg_price_level, avg_rating, visit_count}` | None (live query) |

### Request Bodies

**VerdictRequest:**
```json
{
  "place_id": "ChIJ...",
  "name": "Salt & Pepper",
  "address": "123 Main St",
  "rating": 4.2,
  "price_level": 2,
  "reviews": ["Great biryani", "Loved the ambiance"],
  "reddit_snippets": ["Anyone been to Salt & Pepper? It's solid."]
}
```

**ChatRequest:**
```json
{
  "messages": [{"role": "user", "content": "What should I eat tonight?"}],
  "user_profile": {
    "budget": "$0–$50",
    "dietary": "both",
    "cuisines": ["Desi", "BBQ"],
    "visited_places": [{"name": "Bar.B.Q Tonight"}, ...]
  }
}
```

**HistoryEntry:**
```json
{
  "user_id": "uuid-v4",
  "place_id": "ChIJ...",
  "name": "Cafe Aylanto",
  "cuisine": "Italian",
  "price_level": 3,
  "rating": 4.5
}
```

---

## 9. Caching Strategy

All caching is read-before-write (check cache first; only call external API on miss). Cache entries are stored as JSON blobs in SQLite with a `fetched_at` Unix timestamp. Age is compared at read time: `now - fetched_at < TTL`. No background expiry job — stale entries remain in the DB and are simply overwritten on the next miss.

**Cache invalidation:** There is no manual invalidation. Entries are replaced on the next miss after TTL expiry. `INSERT OR REPLACE` is used throughout, so re-inserting a fresh entry for an existing key atomically replaces the old row.

**Cache key design for nearby:**
`nearby:{lat:.4f}:{lng:.4f}:{radius}:{keyword}` — rounding lat/lng to 4 decimal places (~11m precision) means small GPS jitter doesn't bust the cache.

**`_cached` flag:** Both `/api/places/nearby` and `/api/places/details/{id}` attach `_cached: true` to the response when served from cache. The client doesn't use this for rendering but it aids debugging.

**Verdict caching rationale:** 24-hour TTL is used because restaurant quality/vibe doesn't change day-to-day and LLM calls are the most expensive operation. Reddit/social results use 6 hours (web content changes more often than map data). Nearby search uses 1 hour — typical session length.

---

## 10. Environment Variables

### `server/.env`

| Variable | Service | Purpose |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Cloud | Server-side Places API calls (nearby search, place details). Must have **Places API** enabled. |
| `SERP_API_KEY` | SerpAPI | Web search queries for Reddit buzz and social media links. |
| `GROQ_API_KEY` | Groq Cloud | LLM inference for both the verdict endpoint and the chat stream. |
| `PORT` | Uvicorn | Optional; `start.sh` hard-codes `--port 3001`. |

Missing keys are handled gracefully:
- `GOOGLE_MAPS_API_KEY` absent: nearby returns `{"results":[], "status":"NO_API_KEY"}`; details raises HTTP 503
- `SERP_API_KEY` absent: search returns `{"results":[], "error":"SERP_API_KEY not configured"}`
- `GROQ_API_KEY` absent: verdict raises HTTP 503; chat streams an inline error message

### `client/.env`

| Variable | Service | Purpose |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud | Client-side Maps JS SDK load + Place Photo URL construction. Must have **Maps JavaScript API** and **Places API** enabled. Can be the same key as the server's, but should have HTTP referrer restrictions in production. |

If `VITE_GOOGLE_MAPS_API_KEY` is absent, `MapView` renders a plain list fallback instead of the map canvas. Place photos will not load in `DetailDrawer` or `ForYouSection`.

---

## 11. AI Integration (Groq)

Both AI features use the same model via the official Groq Python SDK.

**Model:** `llama-3.1-8b-instant`

This is a fast, low-latency 8B parameter LLaMA 3.1 model suited for structured short-form output (verdict) and conversational responses (chat).

### Verdict Generation — `routes/verdict.py`

**System prompt (static):**
```
You are a food scout. Given this restaurant data, give a 4-line verdict covering:
vibe, price, standout dish, and best time to visit. Be direct. No fluff.
Format each line as: [Label]: [content]
```

**User message (dynamic, built per request):**
```
Restaurant: {name}
Address: {address}
Google Rating: {rating}/5
Price Range: {price_str}

Google Reviews:
- {review_1}
- {review_2}
- {review_3}

Reddit/Web Buzz:
- {snippet_1}
- {snippet_2}
- {snippet_3}
```

- `max_tokens: 300`
- Non-streaming (full response awaited before caching)
- Price level mapped: `{0:"unknown", 1:"$", 2:"$$", 3:"$$$", 4:"$$$$"}`
- First 3 Google reviews and first 3 Reddit snippets are used

**Client-side parsing:** `VerdictCard` splits each line on the first `:`, renders the left part as an amber label and the right part as body text.

### Chat Stream — `routes/chat.py`

**System prompt (built dynamically from `user_profile`):**
```
You are a food planning assistant for the Nawala app.
User preferences — Budget: {budget}, Dietary: {dietary},
Cuisine preferences: {cuisines}, Recently visited: {visited_str}.
Help them plan meals, suggest restaurants, and answer food-related questions.
Be concise, friendly, and specific. Reference their preferences naturally.
```

- `max_tokens: 600`
- Streaming enabled; response is `text/event-stream`
- Full conversation history is sent on every request (no server-side session)
- Embedded newlines in LLM output are escaped as `\n` in SSE frames; the client un-escapes them

---

## 12. External APIs

### Google Places API

Used by `routes/places.py`. Two endpoints called:

**Nearby Search:**
```
GET https://maps.googleapis.com/maps/api/place/nearbysearch/json
  ?location={lat},{lng}
  &radius={radius}
  &type=restaurant
  &key={GOOGLE_MAPS_API_KEY}
  [&keyword={keyword}]
```

Returns up to 20 results per call. No pagination is implemented. Client-side filtering (`min_rating`, `price_levels`) is applied to the results after retrieval.

**Place Details:**
```
GET https://maps.googleapis.com/maps/api/place/details/json
  ?place_id={place_id}
  &fields=place_id,name,formatted_address,formatted_phone_number,
          opening_hours,rating,user_ratings_total,price_level,
          reviews,website,geometry,photos
  &key={GOOGLE_MAPS_API_KEY}
```

Fields are explicitly listed to minimise API billing.

**Place Photos (client-side, not proxied):**
```
https://maps.googleapis.com/maps/api/place/photo
  ?maxwidth=400
  &photo_reference={ref}
  &key={VITE_GOOGLE_MAPS_API_KEY}
```

Photos are fetched directly from the browser using the client-side key. The `photo_reference` string comes from the `photos[0]` field in the details response.

**Required Google Cloud APIs:**
- Maps JavaScript API (client-side map rendering)
- Places API (both nearby search and place details)

### SerpAPI

Used by `routes/search.py`. Single endpoint called for both Reddit and social queries:

```
GET https://serpapi.com/search
  ?q={query}
  &api_key={SERP_API_KEY}
  &num=5
  &engine=google
```

Returns organic Google search results. The `_extract_results` helper normalises each to: `{title, link, snippet, source, thumbnail}`. Only the first 5 results are kept.

---

## 13. User Profile & Pattern Recognition

### localStorage Schema

Key: `nawala_profile`

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "budget": { "min": 0, "max": 50 },
  "dietary": "both",
  "cuisines": ["Desi", "BBQ"],
  "visited_places": [
    {
      "place_id": "ChIJ...",
      "name": "Bar.B.Q Tonight",
      "cuisine": "BBQ",
      "price_level": 2,
      "rating": 4.4
    }
  ],
  "filters": {
    "radius": 3000,
    "minRating": 3.5,
    "priceLevels": [2, 3],
    "...": "..."
  }
}
```

- `userId` is generated once with `crypto.randomUUID()` and never regenerated
- `visited_places` is capped at 50 entries (oldest dropped)
- `filters` is written on every filter change, enabling ForYouSection to inherit the last used radius

Key: `nawala_chat_history`

```json
[
  {"role": "user", "content": "What should I eat tonight?"},
  {"role": "assistant", "content": "Based on your love of Desi food..."}
]
```

Capped at 20 messages (10 turns). Loaded on Chatbot mount to restore conversation continuity across page refreshes.

### SQLite History

`user_history` stores every "Mark as Visited" event permanently. The `cuisine` column records `profile.cuisines[0]` at the time of the visit (a snapshot, not a lookup).

### Insights Aggregation — `GET /api/profile/insights/{user_id}`

Reads the last 50 history rows for the user and computes:

| Field | Computation |
|---|---|
| `top_cuisines` | Most frequent cuisine values; top 2 returned |
| `avg_price_level` | Mean of `price_level` (defaulting to 2 for nulls) |
| `avg_rating` | Mean of `rating` (defaulting to 4.0 for nulls) |
| `visit_count` | Count of rows |

### How Insights Feed the ForYou Section

`ForYouSection` receives `userProfile` from App (which comes from `useUserProfile` / localStorage, not the insights endpoint). It reads:

1. `userProfile.cuisines.slice(0, 2)` — picks the first preferred cuisine as keyword
2. `userProfile.filters?.radius || 3000` — inherits the last set radius
3. Hard-codes `min_rating: 3.5` to ensure quality picks

It then calls `/api/places/nearby` with those parameters, displaying the top 10 results as a horizontal scrollable card strip overlaid on the map. The label updates to `"For You — {cuisine}"` when a preference is set.

The `/api/profile/insights/{user_id}` endpoint exists but is not currently called by the frontend — it is available for future use (e.g., a weekly digest, a recommendations engine, or a profile page).

---

## 14. How to Run Locally

### Prerequisites

- Python 3.13
- Node.js 20+ and npm
- A Google Cloud project with **Maps JavaScript API** and **Places API** enabled
- A [Groq Cloud](https://console.groq.com) account with an API key
- A [SerpAPI](https://serpapi.com) account with an API key (free tier: 100 searches/month)

### Step 1: Clone and enter the repo

```bash
git clone <repo-url>
cd Nawala
```

### Step 2: Configure server secrets

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
GOOGLE_MAPS_API_KEY=AIza...
SERP_API_KEY=abc123...
GROQ_API_KEY=gsk_...
PORT=3001
```

### Step 3: Configure client key

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

> This can be the same Google key as the server, or a separate restricted key. In development, leave HTTP referrer restrictions off. In production, restrict to your domain.

### Step 4: Set up Python environment

```bash
python3.13 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx groq python-dotenv pydantic
```

### Step 5: Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### Step 6: Start both servers

**Option A — One command (recommended):**
```bash
chmod +x start.sh
./start.sh
```

This starts:
- Uvicorn on `http://localhost:3001` (with `--reload` for hot reload)
- Vite dev server on `http://localhost:5173`

**Option B — Separately (for independent logs):**

Terminal 1:
```bash
source venv/bin/activate
cd server
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

Terminal 2:
```bash
cd client
npm run dev
```

### Step 7: Open the app

- App: [http://localhost:5173](http://localhost:5173)
- FastAPI interactive docs: [http://localhost:3001/docs](http://localhost:3001/docs)
- Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Vite Proxy

`vite.config.js` proxies all `/api/*` requests from the Vite dev server to `http://localhost:3001`. This means the frontend always calls `/api/...` with no hardcoded backend URL — the same pattern works in production by pointing the proxy (or a reverse proxy like nginx) at the actual backend host.

### SQLite Database

`server/nawala.db` is created automatically on first startup by `init_db()`. It is safe to delete; it will be recreated with empty tables on the next run. The file is local to the server directory and is not committed to version control.

---

*End of Nawala Architecture Reference*
