-- ============================================================
-- recipes_cache — stores full Spoonacular recipe details
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes_cache (
  spoonacular_id   int PRIMARY KEY,
  title            text NOT NULL,
  image_url        text,
  ingredient_names text[],            -- flat list for fast overlap queries
  ingredients      jsonb,             -- full ingredient objects [{name,amount,unit,original}]
  instructions     text,
  nutrition        jsonb,             -- {calories, protein, carbs, fat}
  dietary_tags     text[],
  cuisines         text[],
  ready_in_minutes int,
  source_url       text,
  created_at       timestamptz DEFAULT now(),
  last_fetched_at  timestamptz DEFAULT now()
);

-- GIN index for fast array overlap queries
CREATE INDEX IF NOT EXISTS idx_recipes_cache_ingredients
  ON recipes_cache USING GIN (ingredient_names);

-- RLS: public read + public write (API route inserts on behalf of anonymous users)
ALTER TABLE recipes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached recipes"
  ON recipes_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cached recipes"
  ON recipes_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cached recipes"
  ON recipes_cache FOR UPDATE
  USING (true);
