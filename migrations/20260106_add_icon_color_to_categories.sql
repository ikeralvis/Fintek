-- Add icon and color columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '💰',
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';
