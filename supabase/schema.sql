-- ============================================================
-- UC Davis Pantry — Supabase Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable pgcrypto for gen_random_uuid() (already available in Supabase)

-- ─── inventory ────────────────────────────────────────────────────────────────
-- Tracks items currently in or expected into the pantry.
-- date_available = NULL means the item is available right now.
-- date_available = a future date means it's coming via a shipment.

create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null default 'General',
  quantity       numeric not null default 0 check (quantity >= 0),
  unit           text not null default 'item',
  dietary_tags   text[] not null default '{}',
  date_available date null,  -- null = in stock today
  created_at     timestamptz not null default now()
);

-- Index for common filter patterns
create index if not exists inventory_category_idx on inventory (category);
create index if not exists inventory_date_available_idx on inventory (date_available);

-- ─── shipments ────────────────────────────────────────────────────────────────
-- Tracks upcoming deliveries. Separate from inventory so staff can manage
-- expected arrivals independently.

create table if not exists shipments (
  id                uuid primary key default gen_random_uuid(),
  item_name         text not null,
  expected_quantity numeric not null default 0 check (expected_quantity >= 0),
  unit              text not null default 'item',
  expected_date     date not null,
  notes             text null,
  created_at        timestamptz not null default now()
);

create index if not exists shipments_expected_date_idx on shipments (expected_date);

-- ─── recipe_interactions ──────────────────────────────────────────────────────
-- Tracks student views and likes of Spoonacular recipes.
-- recipe_id is the Spoonacular integer ID (not a UUID).

create table if not exists recipe_interactions (
  id               uuid primary key default gen_random_uuid(),
  recipe_id        integer not null,
  recipe_title     text not null,
  recipe_image_url text null,
  interaction_type text not null check (interaction_type in ('view', 'like')),
  created_at       timestamptz not null default now()
);

create index if not exists recipe_interactions_recipe_id_idx on recipe_interactions (recipe_id);
create index if not exists recipe_interactions_type_idx on recipe_interactions (interaction_type);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- inventory and shipments: public read, authenticated write
-- recipe_interactions: public read AND insert (students don't log in)

alter table inventory enable row level security;
alter table shipments enable row level security;
alter table recipe_interactions enable row level security;

-- inventory policies
create policy "Public can read inventory"
  on inventory for select using (true);

create policy "Authenticated users can manage inventory"
  on inventory for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- shipments policies
create policy "Public can read shipments"
  on shipments for select using (true);

create policy "Authenticated users can manage shipments"
  on shipments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- recipe_interactions policies
create policy "Anyone can read recipe interactions"
  on recipe_interactions for select using (true);

create policy "Anyone can insert recipe interactions"
  on recipe_interactions for insert with check (true);

-- ─── Helpful view: popular recipes ───────────────────────────────────────────
-- Aggregates interaction counts for the Popular Recipes tab.

create or replace view popular_recipes as
select
  recipe_id,
  recipe_title,
  recipe_image_url,
  count(*) filter (where interaction_type = 'view') as view_count,
  count(*) filter (where interaction_type = 'like') as like_count,
  count(*) as total_interactions
from recipe_interactions
group by recipe_id, recipe_title, recipe_image_url
order by total_interactions desc;
