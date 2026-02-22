-- Fix popular_recipes view grouping by recipe_id only.
-- Previously grouped by (recipe_id, recipe_title, recipe_image_url),
-- which created duplicate rows when the same recipe was logged with
-- different image URLs (e.g. null vs real URL) at different times.
-- max() ignores NULLs so it picks the best available value.

create or replace view popular_recipes as
select
  recipe_id,
  max(recipe_title)     as recipe_title,
  max(recipe_image_url) as recipe_image_url,
  count(*) filter (where interaction_type = 'view') as view_count,
  count(*) filter (where interaction_type = 'like') as like_count,
  count(*)                                          as total_interactions
from recipe_interactions
group by recipe_id
order by total_interactions desc;
