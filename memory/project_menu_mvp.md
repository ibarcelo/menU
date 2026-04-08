---
name: menU MVP project overview
description: Core architecture decisions and tech stack for the menU restaurant menu scanning app
type: project
---

Mobile-first web app for scanning restaurant menus with AI and organizing group orders collaboratively.

**Stack:** Next.js 15 (App Router) + FastAPI + Supabase (PostgreSQL + Realtime) + Claude Vision (Anthropic)

**Key architecture decisions:**
- Single session page `/s/[id]` — no separate join/host pages. Identity stored in localStorage.
- FastAPI handles AI calls via BackgroundTasks (async) — frontend gets updates via Supabase Realtime, no polling.
- Claude Vision: all images sent in one API call, strict JSON output, one retry with correction prompt on parse failure.
- Prices: float or null + `price_text` for unparseable (market price). `special_price: true` flag.
- Orders: UPSERT on (session_id, participant_id, menu_item_id). quantity=0 = delete.
- Camera: `<input capture="environment">` primary (reliable on iOS/Android), getUserMedia fallback for desktop.
- No auth — name-based joining, UNIQUE(session_id, name) prevents duplicates. Presence via 30s heartbeat.
- Realtime: Supabase channels on menu_items, orders, scan_jobs, sessions tables.

**Why:** Realized as a 2-3 week solo dev MVP. No over-engineering — no auth, no Docker, deploy to Vercel (frontend) + Railway/Render (backend).
