-- ============================================================
-- menU – Saved Visits (user profile history)
-- ============================================================

-- saved_visits: each row is one restaurant visit saved by a user.
-- `items` is a JSONB snapshot so visits remain readable even after
-- sessions expire and menu_items rows are deleted.
CREATE TABLE saved_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL DEFAULT 'Unknown Restaurant',
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  general_note    TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  -- items schema: [{menu_item_id, name, price, quantity, note, subtotal}]
  grand_total     NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_visits_user_idx ON saved_visits(user_id, visited_at DESC);

ALTER TABLE saved_visits ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own visits
CREATE POLICY "own_visits_all" ON saved_visits
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
