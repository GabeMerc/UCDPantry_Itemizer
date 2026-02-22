-- ============================================================
-- FIX: Tighten RLS policies on recipes_cache
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).
--
-- The original policies allowed anyone (anonymous) to INSERT
-- and UPDATE recipes. All admin writes go through the service
-- role which bypasses RLS entirely, so public write access
-- is unnecessary and a security risk.
-- ============================================================

-- Drop the overly permissive write policies
DROP POLICY IF EXISTS "Anyone can insert cached recipes" ON recipes_cache;
DROP POLICY IF EXISTS "Anyone can update cached recipes" ON recipes_cache;

-- Public read remains (students browse recipes without logging in)
-- "Anyone can read cached recipes" policy is fine as-is.

-- All writes to recipes_cache now only happen via the service role
-- (from admin API routes), which bypasses RLS entirely. ✓


-- ============================================================
-- FIX: Tighten RLS on site_settings
-- Admin API keys stored here should never be readable via
-- the anon/public client. Only service role accesses this.
-- ============================================================

-- Ensure RLS is enabled (may already be set)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Remove any existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read site_settings" ON site_settings;
DROP POLICY IF EXISTS "Authenticated can read site_settings" ON site_settings;

-- No public policies at all — service role only
-- Service role bypasses RLS, so admin routes will still work. ✓
