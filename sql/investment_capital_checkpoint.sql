-- Punto de partida del capital aportado en las cuentas de inversión.
--
-- accounts.contributed_capital es el TOTAL aportado (lo mantiene el usuario). Las aportaciones
-- creadas desde transferencias con fecha <= contributions_checkpoint solo ponen fecha a dinero
-- que ya está en ese total; las posteriores lo suben solas (ya no hay que actualizarlo a mano).
--
-- Al ejecutarlo, el punto de partida de las cuentas de inversión existentes es HOY: se da por
-- bueno el capital que tienen ahora. Idempotente: se puede re-ejecutar sin mover la fecha.
-- Ejecutar en el SQL Editor de Supabase.

alter table public.accounts
  add column if not exists contributions_checkpoint date null;

update public.accounts
  set contributions_checkpoint = current_date
  where type = 'investment' and contributions_checkpoint is null;
