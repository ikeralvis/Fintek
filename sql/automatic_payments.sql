-- Pagos automáticos: la tabla `subscriptions` pasa a admitir gastos, ingresos y transferencias
-- (p. ej. ahorro periódico), y marcar cuáles cuentan como "suscripción" en los totales.
-- Ejecutar en el SQL Editor de Supabase. Las filas existentes quedan como gasto + suscripción.

alter table public.subscriptions
  add column if not exists type text not null default 'expense',
  add column if not exists to_account_id uuid null references public.accounts (id) on delete set null,
  add column if not exists is_subscription boolean not null default true;

alter table public.subscriptions drop constraint if exists subscriptions_type_check;
alter table public.subscriptions
  add constraint subscriptions_type_check check (type = any (array['expense'::text, 'income'::text, 'transfer'::text]));
