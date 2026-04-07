# menU

**Scan a restaurant menu with your phone. Organize the group order in real time.**

No login required. Works on any mobile browser.

---

## How it works

1. One person creates a table session
2. They photograph the menu (1–5 photos)
3. Claude AI extracts all dishes automatically
4. Share the session link / QR code with friends
5. Everyone picks their dishes in real time
6. See the full order summary with totals

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL via Supabase |
| Realtime | Supabase Realtime |
| AI | Claude Vision (Anthropic) |

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration: `supabase/migrations/001_initial.sql` in the SQL editor
3. Copy your **Project URL** and **anon key** (for frontend) + **service role key** (for backend)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload
# API runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm install
npm run dev
# App runs on http://localhost:3000
```

---

## Deployment

### Backend → Railway or Render
- Connect repo, set root directory to `backend/`
- Add env vars from `.env.example`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel
- Connect repo, set root directory to `frontend/`
- Add env vars from `.env.example`
- Set `NEXT_PUBLIC_API_URL` to your Railway/Render backend URL

---

## Project Structure

```
menU/
├── backend/              # FastAPI
│   ├── main.py           # App entry point + CORS
│   ├── routers/
│   │   ├── sessions.py   # Create / get session
│   │   ├── scan.py       # Upload images → AI processing (async)
│   │   ├── menu.py       # CRUD menu items
│   │   └── orders.py     # Join session, orders, participants
│   ├── services/
│   │   └── ai_vision.py  # Claude Vision integration + prompt
│   ├── models/           # Pydantic schemas
│   └── db/
│       └── supabase_client.py
│
├── frontend/             # Next.js
│   ├── app/
│   │   ├── page.tsx      # Home: create session
│   │   └── s/[id]/       # Session page (scan + menu + orders)
│   ├── components/
│   │   ├── scan/         # Camera capture + upload
│   │   ├── menu/         # Menu display + editing
│   │   ├── orders/       # Cart + order summary
│   │   └── session/      # Name gate + QR share
│   ├── lib/
│   │   ├── api.ts        # FastAPI client
│   │   └── supabase.ts   # Supabase client
│   └── types/            # Shared TypeScript types
│
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## AI Prompt (menu extraction)

The backend sends all photos in a single Claude API call with this prompt strategy:

- **System**: "You are a menu digitization assistant. Respond only with valid JSON."
- **User**: Images + structured extraction instructions
- **Output**: `{ restaurant, sections: [{ category, items: [{ name, price, description, tags }] }] }`
- **Retry**: If JSON parsing fails, one automatic retry with a correction prompt
- **Fallback**: Unparseable prices stored as `price_text` (e.g. "Market price") with `special_price: true`

---

## API Reference

```
POST   /api/sessions                          Create session
GET    /api/sessions/:id                      Get session

POST   /api/sessions/:id/scan                 Upload images + start AI processing
GET    /api/sessions/:id/scan/:jobId          Get scan job status

GET    /api/sessions/:id/menu                 Get menu (grouped by category)
POST   /api/sessions/:id/menu                 Add menu item
PATCH  /api/sessions/:id/menu/:itemId         Update menu item
DELETE /api/sessions/:id/menu/:itemId         Delete menu item

POST   /api/sessions/:id/participants         Join session (name-based)
PATCH  /api/sessions/:id/participants/:id/heartbeat   Presence keepalive
GET    /api/sessions/:id/participants         List participants

PUT    /api/sessions/:id/orders               Upsert order (quantity=0 removes)
GET    /api/sessions/:id/orders               Get all orders with totals
```
