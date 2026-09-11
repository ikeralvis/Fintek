-- Migration: Presupuestos con ahorro, ingreso mensual y colchón
-- Date: 2026-09-11
--
-- 1) Marca qué items de presupuesto son "ahorro" (se restan del ingreso pero
--    no se tratan como gasto ni consumen el colchón).
-- 2) Configuración del mes: ingreso mensual (fijado a mano por el usuario) y
--    colchón compartido para absorber los excesos de las categorías de gasto.

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS is_savings boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS budget_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric(12,2) not null default 0,
  cushion numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budget settings"
  ON budget_settings FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own budget settings"
  ON budget_settings FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own budget settings"
  ON budget_settings FOR UPDATE
  USING (user_id = (select auth.uid()));

COMMENT ON COLUMN budgets.is_savings IS
'Si es true, este item de presupuesto es ahorro (ej. aportación mensual a inversión): se resta del ingreso en la banda visual, pero no cuenta como gasto ni consume el colchón.';

COMMENT ON TABLE budget_settings IS
'Configuración del presupuesto mensual por usuario: ingreso esperado (fijado a mano) y colchón compartido para absorber excesos de las categorías de gasto.';
