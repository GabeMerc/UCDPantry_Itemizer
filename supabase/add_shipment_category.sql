-- Add category to shipments so received items can be filed into inventory correctly
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Pantry';
