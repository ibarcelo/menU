-- Add numeric restaurant rating (1-5) to saved_visits
ALTER TABLE saved_visits
  ADD COLUMN IF NOT EXISTS restaurant_rating SMALLINT
  CHECK (restaurant_rating BETWEEN 1 AND 5);
