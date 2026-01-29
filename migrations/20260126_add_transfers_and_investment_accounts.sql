-- Migration: Add transfer transactions and investment account types
-- Date: 2026-01-26

-- 1. Expand account types to include investments, crypto, etc.
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_type_check;

ALTER TABLE accounts
ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('checking', 'savings', 'wallet', 'investment_fund', 'investment', 'cryptocurrency', 'other'));

-- 2. Expand transaction types to include transfers
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'transfer'));

-- 3. Add related_account_id column to track transfer destination
-- This allows us to link both sides of a transfer in a single transaction
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS related_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_related_account_id ON transactions(related_account_id);

-- 4. Update trigger to handle transfers (transfer transactions don't update balance directly)
-- The transfer balance updates will be handled by application logic
DROP TRIGGER IF EXISTS update_account_balance_trigger ON transactions;

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance for income and expense transactions
  -- Transfer transactions are handled by application logic
  IF NEW.type IN ('income', 'expense') THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE accounts 
      SET current_balance = 
        CASE 
          WHEN NEW.type = 'income' THEN current_balance + NEW.amount
          WHEN NEW.type = 'expense' THEN current_balance - NEW.amount
        END,
      updated_at = now()
      WHERE id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE accounts 
      SET current_balance = 
        CASE 
          WHEN OLD.type = 'income' THEN current_balance - OLD.amount
          WHEN OLD.type = 'expense' THEN current_balance + OLD.amount
        END,
      updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Add comment documenting the related_account_id field
COMMENT ON COLUMN transactions.related_account_id IS 
'For transfer transactions: the destination account. For income/expense: NULL';
