-- Migration: Add contributed_capital to accounts (manual tracking of money put into investments)
-- Date: 2026-09-02
--
-- Reemplaza el cálculo de aportaciones basado en transacciones de tipo "transfer"
-- (que fallaba cuando el dinero tardaba varios días en reflejarse en el fondo tras
-- la transferencia) por un campo manual: el usuario indica cuánto ha aportado en
-- total a cada cuenta de inversión, y esa cifra se compara contra el saldo real
-- para calcular el rendimiento.

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS contributed_capital numeric(12,2) NOT NULL DEFAULT 0;

-- Para cuentas de inversión ya existentes, se usa el saldo actual como punto de
-- partida razonable; el usuario lo ajustará manualmente si no es exacto.
UPDATE accounts
SET contributed_capital = current_balance
WHERE type IN ('investment', 'investment_fund')
  AND contributed_capital = 0;

COMMENT ON COLUMN accounts.contributed_capital IS
'Dinero total aportado (capital invertido) a esta cuenta, introducido manualmente por el usuario. Se compara contra current_balance para calcular el rendimiento real, en vez de inferirlo de las transacciones de transferencia.';
