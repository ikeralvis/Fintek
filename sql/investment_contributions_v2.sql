-- Inversiones v2: aportaciones enlazadas a transferencias y "pendientes de invertir".
--
-- - source: 'manual' (las de siempre, ya sumadas en accounts.contributed_capital) o 'transfer'
--   (creadas solas a partir de una transferencia a/desde la cuenta de inversión; NO se suman a
--   contributed_capital: el total aportado = contributed_capital + aportaciones 'transfer').
-- - transaction_id: la transferencia de la que viene (una aportación por transferencia).
-- - status / invested_date: el dinero llega a la cuenta el día de la transferencia, pero el
--   bróker tarda días en comprar participaciones. Mientras está 'pending', la app lo suma al
--   valor apuntado para que esos días no parezcan pérdida (ni ganancia al comprarse).
--
-- Idempotente: se puede re-ejecutar. Ejecutar en el SQL Editor de Supabase.

alter table public.investment_contributions
  add column if not exists source text not null default 'manual',
  add column if not exists transaction_id uuid null references public.transactions (id) on delete set null,
  add column if not exists status text not null default 'invested',
  add column if not exists invested_date date null;

alter table public.investment_contributions drop constraint if exists investment_contributions_source_check;
alter table public.investment_contributions
  add constraint investment_contributions_source_check check (source in ('manual', 'transfer'));

alter table public.investment_contributions drop constraint if exists investment_contributions_status_check;
alter table public.investment_contributions
  add constraint investment_contributions_status_check check (status in ('pending', 'invested'));

-- Una transferencia solo puede dar lugar a una aportación por cuenta (la de origen y la de
-- destino pueden ser ambas de inversión: una retirada en una y una aportación en otra).
create unique index if not exists investment_contributions_tx_account_key
  on public.investment_contributions (transaction_id, account_id)
  where transaction_id is not null;
