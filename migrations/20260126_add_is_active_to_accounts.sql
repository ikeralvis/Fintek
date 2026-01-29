-- Migration: Add is_active status to accounts for soft deletion
-- Date: 2026-01-26

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster queries of active accounts
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(user_id, is_active);

-- Update existing accounts to be active
UPDATE accounts SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN accounts.is_active IS 'Soft delete flag: false means account is cancelled but kept for historical/audit purposes';
