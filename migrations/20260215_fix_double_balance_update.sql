-- Migration: Fix double balance update issue
-- Date: 2026-02-15
-- Problem: Trigger handles INSERT/DELETE but not UPDATE, causing inconsistencies
-- Solution: Add UPDATE handling to trigger and remove manual balance updates from app code

DROP TRIGGER IF EXISTS update_account_balance_trigger ON transactions;

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance for income and expense transactions
  -- Transfer transactions are handled by application logic
  IF TG_OP = 'INSERT' THEN
    IF NEW.type IN ('income', 'expense') THEN
      UPDATE accounts 
      SET current_balance = 
        CASE 
          WHEN NEW.type = 'income' THEN current_balance + NEW.amount
          WHEN NEW.type = 'expense' THEN current_balance - NEW.amount
        END,
      updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process if it's an income/expense transaction
    IF OLD.type IN ('income', 'expense') OR NEW.type IN ('income', 'expense') THEN
      -- If account changed, revert old account and update new account
      IF OLD.account_id != NEW.account_id THEN
        -- Revert old account (if was income/expense)
        IF OLD.type IN ('income', 'expense') THEN
          UPDATE accounts 
          SET current_balance = 
            CASE 
              WHEN OLD.type = 'income' THEN current_balance - OLD.amount
              WHEN OLD.type = 'expense' THEN current_balance + OLD.amount
            END,
          updated_at = now()
          WHERE id = OLD.account_id;
        END IF;
        
        -- Apply to new account (if is income/expense)
        IF NEW.type IN ('income', 'expense') THEN
          UPDATE accounts 
          SET current_balance = 
            CASE 
              WHEN NEW.type = 'income' THEN current_balance + NEW.amount
              WHEN NEW.type = 'expense' THEN current_balance - NEW.amount
            END,
          updated_at = now()
          WHERE id = NEW.account_id;
        END IF;
      ELSE
        -- Same account, but amount or type might have changed
        IF OLD.type IN ('income', 'expense') AND NEW.type IN ('income', 'expense') THEN
          UPDATE accounts 
          SET current_balance = 
            -- Revert old transaction
            CASE 
              WHEN OLD.type = 'income' THEN current_balance - OLD.amount
              WHEN OLD.type = 'expense' THEN current_balance + OLD.amount
            END +
            -- Apply new transaction
            CASE 
              WHEN NEW.type = 'income' THEN NEW.amount
              WHEN NEW.type = 'expense' THEN -NEW.amount
              ELSE 0
            END,
          updated_at = now()
          WHERE id = NEW.account_id;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type IN ('income', 'expense') THEN
      UPDATE accounts 
      SET current_balance = 
        CASE 
          WHEN OLD.type = 'income' THEN current_balance - OLD.amount
          WHEN OLD.type = 'expense' THEN current_balance + OLD.amount
        END,
      updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Add comment documenting the trigger behavior
COMMENT ON TRIGGER update_account_balance_trigger ON transactions IS 
'Automatically updates account balances when transactions are inserted, updated, or deleted. Only applies to income and expense transactions (not transfers).';
