-- Aportaciones "fechadas a posteriori" (source = 'backfill'): ponen fecha a dinero que ya está
-- dentro de accounts.contributed_capital pero que nunca se apuntó con su día. NO cambian el
-- capital total; solo sirven para que ese salto del valor no cuente como ganancia.
-- Idempotente: se puede re-ejecutar. Ejecutar en el SQL Editor de Supabase.

alter table public.investment_contributions drop constraint if exists investment_contributions_source_check;
alter table public.investment_contributions
  add constraint investment_contributions_source_check check (source in ('manual', 'transfer', 'backfill'));
