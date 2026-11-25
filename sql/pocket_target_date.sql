-- Fecha objetivo opcional para los apartados (objetivos de ahorro): con ella la app calcula
-- cuánto hay que apartar al mes para llegar a tiempo. Idempotente: se puede re-ejecutar.
-- Ejecutar en el SQL Editor de Supabase.

alter table public.account_pockets
  add column if not exists target_date date null;
