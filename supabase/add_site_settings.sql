-- Site-wide key/value settings table
-- Used to store admin-configurable values like API keys.
-- No public access — all reads/writes go through the service role key.

CREATE TABLE IF NOT EXISTS site_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- No public policies — service role bypasses RLS entirely.
-- Admins interact via authenticated API routes using the service role client.
