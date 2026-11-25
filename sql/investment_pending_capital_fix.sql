-- Corrección única tras sql/investment_capital_checkpoint.sql.
--
-- Al fijar el punto de partida en "hoy", las transferencias aún PENDIENTES de invertir
-- quedaron como si ya estuvieran dentro de contributed_capital. Pero ese capital se puso antes
-- de que llegaran (el usuario lo actualiza cuando el bróker compra). Esto las suma al capital y
-- mueve el punto de partida al día anterior a la primera pendiente de cada cuenta.
--
-- Seguro de re-ejecutar: tras aplicarse, el punto de partida queda antes de esas aportaciones
-- y la condición ya no se cumple, así que no vuelve a sumar nada.
-- Ejecutar en el SQL Editor de Supabase.

with pending as (
  select account_id, sum(amount) as total, min(contribution_date) as first_date
  from public.investment_contributions
  where source = 'transfer' and status = 'pending' and amount > 0
  group by account_id
)
update public.accounts a
set contributed_capital = a.contributed_capital + p.total,
    contributions_checkpoint = p.first_date - 1
from pending p
where a.id = p.account_id
  and a.type = 'investment'
  and a.contributions_checkpoint is not null
  and a.contributions_checkpoint >= p.first_date;
