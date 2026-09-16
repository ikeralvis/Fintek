-- Migration: Persistencia real (Supabase) de las decisiones de "Presupuesto Sobrante"
-- Date: 2026-09-17
--
-- Sustituye el seguimiento local (localStorage) de qué sobrantes de mes anterior ya se
-- gestionaron (Rollover / Auto-Ahorro / Ignorado), para que el estado sincronice al
-- instante entre dispositivos del mismo usuario en vez de depender de la caché del navegador.

CREATE TABLE IF NOT EXISTS budget_rollover_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month_key text not null, -- Mes cuyo sobrante se gestionó, formato 'yyyy-MM' (ej. '2026-08')
  action text not null check (action in ('rollover', 'auto_savings', 'dismissed')),
  surplus numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month_key)
);

ALTER TABLE budget_rollover_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rollover actions"
  ON budget_rollover_actions FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own rollover actions"
  ON budget_rollover_actions FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

COMMENT ON TABLE budget_rollover_actions IS
'Una fila por (usuario, categoría, mes) ya resuelta desde la tarjeta "Presupuesto sobrante detectado": qué acción se tomó (rollover al mes actual, auto-ahorro, o ignorado) y el importe del sobrante en ese momento. Persistida en servidor para que el estado sea el mismo en cualquier dispositivo.';
