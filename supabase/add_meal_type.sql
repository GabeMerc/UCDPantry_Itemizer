-- ============================================================
-- Add meal_type column to recipes_cache
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recipes_cache
  ADD COLUMN IF NOT EXISTS meal_type text DEFAULT 'unknown';

-- Index for filtering by meal type
CREATE INDEX IF NOT EXISTS idx_recipes_cache_meal_type
  ON recipes_cache (meal_type);

-- Backfill existing rows: mark them as 'unknown'
-- (they'll be re-classified on next fetch from Spoonacular)
UPDATE recipes_cache
  SET meal_type = 'unknown'
  WHERE meal_type IS NULL;
