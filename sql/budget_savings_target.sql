-- Ahorro previsto del mes (un único importe) para Presupuestos: el plan pasa a ser
-- ingreso − ahorro previsto − margen de seguridad = dinero para repartir entre categorías.
-- Idempotente: se puede re-ejecutar. Ejecutar en el SQL Editor de Supabase.

alter table public.budget_settings
  add column if not exists savings_target numeric(12, 2) not null default 0;

alter table public.budget_settings
  drop constraint if exists budget_settings_savings_target_check;
alter table public.budget_settings
  add constraint budget_settings_savings_target_check check (savings_target >= 0);
