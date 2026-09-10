-- Migration: Log de aportaciones a cuentas de inversión (con fecha)
-- Date: 2026-09-10
--
-- accounts.contributed_capital guarda el total aportado, pero al ser un único
-- número no permite saber en qué día se hizo cada aportación, y por tanto el
-- desglose "ganancia de hoy" no puede excluir el dinero recién metido ese día
-- (una aportación de 50€ aparecía como si fuera rendimiento del mercado).
--
-- Esta tabla registra cada cambio de contributed_capital como un delta con
-- fecha (elegida por el usuario, normalmente el día que el dinero aparece
-- reflejado en el fondo), para poder restar las aportaciones del cambio
-- diario/semanal/mensual y quedarnos solo con el rendimiento real.

CREATE TABLE IF NOT EXISTS investment_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  amount numeric(12,2) not null,
  contribution_date date not null default current_date,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_investment_contributions_account_date
  ON investment_contributions(account_id, contribution_date);

ALTER TABLE investment_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own investment contributions"
  ON investment_contributions FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own investment contributions"
  ON investment_contributions FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own investment contributions"
  ON investment_contributions FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own investment contributions"
  ON investment_contributions FOR DELETE
  USING (user_id = (select auth.uid()));

COMMENT ON TABLE investment_contributions IS
'Historial con fecha de cada cambio manual de accounts.contributed_capital, usado para excluir aportaciones del cálculo de ganancia diaria/semanal/mensual.';
