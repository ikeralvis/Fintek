-- Add is_favorite column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
