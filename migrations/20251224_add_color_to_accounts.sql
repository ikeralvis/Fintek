-- Add color column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS color text DEFAULT '#000000';
