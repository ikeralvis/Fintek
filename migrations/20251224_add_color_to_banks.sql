-- Add color column to banks table
ALTER TABLE banks ADD COLUMN IF NOT EXISTS color text DEFAULT '#000000';
