-- Change restaurant_rating from SMALLINT to NUMERIC(3,1) to support half-stars (e.g. 4.5)
ALTER TABLE saved_visits
  DROP CONSTRAINT IF EXISTS saved_visits_restaurant_rating_check;

ALTER TABLE saved_visits
  ALTER COLUMN restaurant_rating TYPE NUMERIC(3,1) USING restaurant_rating::NUMERIC(3,1);

ALTER TABLE saved_visits
  ADD CONSTRAINT saved_visits_restaurant_rating_check
  CHECK (restaurant_rating >= 0 AND restaurant_rating <= 5);
