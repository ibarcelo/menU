-- ============================================================
-- menU – Initial Schema
-- ============================================================

-- Sessions: one per dining group
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  status        TEXT NOT NULL DEFAULT 'scanning'
                CHECK (status IN ('scanning', 'processing', 'ready', 'error')),
  restaurant    TEXT,
  raw_menu_json JSONB          -- archived full Claude response
);

-- Menu items: populated after Claude Vision processing
CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category      TEXT NOT NULL DEFAULT 'Other',
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2),
  price_text    TEXT,          -- raw string if price unparseable ("Market price")
  special_price BOOLEAN NOT NULL DEFAULT false,  -- true = MP/market price
  tags          TEXT[] DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX menu_items_session_idx ON menu_items(session_id);
CREATE INDEX menu_items_session_cat_idx ON menu_items(session_id, category, sort_order);

-- Participants: name-only, no auth
CREATE TABLE participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, name)
);

CREATE INDEX participants_session_idx ON participants(session_id);

-- Orders: one row per (participant, menu_item). Quantity 0 = deleted.
CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  menu_item_id   UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, participant_id, menu_item_id)
);

CREATE INDEX orders_session_idx ON orders(session_id);
CREATE INDEX orders_participant_idx ON orders(participant_id);

-- Scan jobs: track async image processing
CREATE TABLE scan_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'done', 'error')),
  image_count   INTEGER NOT NULL DEFAULT 0,
  image_paths   TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scan_jobs_session_idx ON scan_jobs(session_id);

-- ============================================================
-- Row Level Security (permissive for MVP – lock down post-launch)
-- ============================================================

ALTER TABLE sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON sessions     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON menu_items   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON orders       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON scan_jobs    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Supabase Realtime: enable for live order/menu updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_jobs;
