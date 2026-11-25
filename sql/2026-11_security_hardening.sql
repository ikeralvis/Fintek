-- =====================================================================================
-- Endurecimiento de seguridad (auditoría 2026-11, hallazgos F-01, F-03, F-06, V-01).
-- Ejecutar ENTERO en el SQL Editor de Supabase ANTES de desplegar el código que usa
-- create_transfer / update_transfer / delete_transfer. Es idempotente: se puede re-ejecutar.
--
-- Qué hace:
--  1. Funciones owns_* : "¿esta cuenta/categoría/banco/apartado es del usuario actual?".
--  2. Para TODA tabla de `public` con columna user_id: activa RLS y recrea las políticas
--     (select/insert/update/delete) exigiendo user_id = auth.uid() Y que cualquier
--     account_id / to_account_id / related_account_id / category_id / bank_id / pocket_id
--     apunte a un recurso del mismo usuario. Las políticas UPDATE ahora llevan WITH CHECK.
--  3. Transferencias atómicas (create/update/delete_transfer) con bloqueo de filas.
--  4. pocket_move: falla si la cuenta del apartado no es visible para el usuario.
-- =====================================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Funciones de propiedad (SECURITY INVOKER: además se aplica RLS del llamante)
-- ---------------------------------------------------------------------------
create or replace function public.owns_account(p_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select p_id is null or exists (select 1 from public.accounts where id = p_id and user_id = (select auth.uid()));
$$;

create or replace function public.owns_category(p_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select p_id is null or exists (select 1 from public.categories where id = p_id and user_id = (select auth.uid()));
$$;

create or replace function public.owns_bank(p_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select p_id is null or exists (select 1 from public.banks where id = p_id and user_id = (select auth.uid()));
$$;

create or replace function public.owns_pocket(p_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select p_id is null or exists (select 1 from public.account_pockets where id = p_id and user_id = (select auth.uid()));
$$;

revoke execute on function public.owns_account(uuid), public.owns_category(uuid),
  public.owns_bank(uuid), public.owns_pocket(uuid) from public, anon;
grant execute on function public.owns_account(uuid), public.owns_category(uuid),
  public.owns_bank(uuid), public.owns_pocket(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. RLS + políticas con comprobación de propiedad en todas las tablas con user_id
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
  pol record;
  fk_check text;
  col record;
  append_only constant text[] := array['pocket_movements'];  -- historial inmutable
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'user_id'
  loop
    -- Construir la condición de propiedad para las FKs presentes en la tabla
    fk_check := '';
    for col in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = t.table_name
        and column_name in ('account_id', 'to_account_id', 'related_account_id', 'category_id', 'bank_id', 'pocket_id')
    loop
      fk_check := fk_check || format(' and public.%s(%I)',
        case
          when col.column_name in ('account_id', 'to_account_id', 'related_account_id') then 'owns_account'
          when col.column_name = 'category_id' then 'owns_category'
          when col.column_name = 'bank_id' then 'owns_bank'
          else 'owns_pocket'
        end,
        col.column_name);
    end loop;

    execute format('alter table public.%I enable row level security', t.table_name);

    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t.table_name loop
      execute format('drop policy %I on public.%I', pol.policyname, t.table_name);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      'own_select', t.table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid())%s)',
      'own_insert', t.table_name, fk_check);

    if not (t.table_name = any (append_only)) then
      execute format(
        'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid())%s)',
        'own_update', t.table_name, fk_check);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
        'own_delete', t.table_name);
    end if;

    raise notice 'RLS asegurada en %: comprobaciones FK =%', t.table_name, coalesce(nullif(fk_check, ''), ' (ninguna)');
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Transferencias atómicas
-- ---------------------------------------------------------------------------
-- Usuario efectivo: el del JWT. Solo service_role (crons) puede actuar en nombre de otro.
create or replace function public.transfer_actor(p_user_id uuid)
returns uuid language plpgsql stable security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is not null then
    if p_user_id is not null and p_user_id <> v_uid then
      raise exception 'No autorizado';
    end if;
    return v_uid;
  end if;
  if p_user_id is not null and (current_user = 'service_role' or coalesce(auth.role(), '') = 'service_role') then
    return p_user_id;
  end if;
  raise exception 'No autenticado';
end;
$$;

-- Bloquea (FOR UPDATE, en orden de id para evitar interbloqueos) las cuentas indicadas del
-- usuario y falla si alguna no existe o no es suya.
create or replace function public.lock_user_accounts(p_user_id uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_wanted int;
  v_locked int;
begin
  select count(distinct x) into v_wanted from unnest(p_ids) x where x is not null;
  perform 1 from accounts where id = any (p_ids) and user_id = p_user_id order by id for update;
  select count(*) into v_locked from accounts where id = any (p_ids) and user_id = p_user_id;
  if v_locked <> v_wanted then
    raise exception 'Una o más cuentas no existen o no son tuyas';
  end if;
end;
$$;

create or replace function public.create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transaction_date date,
  p_description text default null,
  p_category_id uuid default null,
  p_enforce_balance boolean default true,
  p_user_id uuid default null
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := public.transfer_actor(p_user_id);
  v_balance numeric;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El importe debe ser mayor que 0';
  end if;
  if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
    raise exception 'No puedes transferir a la misma cuenta';
  end if;
  if p_category_id is not null
     and not exists (select 1 from categories where id = p_category_id and user_id = v_uid) then
    raise exception 'Categoría no válida';
  end if;

  perform public.lock_user_accounts(v_uid, array[p_from_account_id, p_to_account_id]);

  select current_balance into v_balance from accounts where id = p_from_account_id;
  if p_enforce_balance and v_balance < p_amount then
    raise exception 'Saldo insuficiente en la cuenta de origen';
  end if;

  insert into transactions (user_id, type, account_id, related_account_id, amount, description, transaction_date, category_id)
  values (v_uid, 'transfer', p_from_account_id, p_to_account_id, p_amount,
          coalesce(nullif(trim(p_description), ''), 'Transferencia'), p_transaction_date, p_category_id)
  returning id into v_id;

  -- El trigger de saldo no cubre las transferencias: se ajustan aquí, de forma relativa.
  update accounts set current_balance = current_balance - p_amount, updated_at = now() where id = p_from_account_id;
  update accounts set current_balance = current_balance + p_amount, updated_at = now() where id = p_to_account_id;

  return v_id;
end;
$$;

create or replace function public.update_transfer(
  p_transaction_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transaction_date date,
  p_description text default null,
  p_category_id uuid default null
)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := public.transfer_actor(null);
  v_tx transactions%rowtype;
  v_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El importe debe ser mayor que 0';
  end if;
  if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
    raise exception 'No puedes transferir a la misma cuenta';
  end if;
  if p_category_id is not null
     and not exists (select 1 from categories where id = p_category_id and user_id = v_uid) then
    raise exception 'Categoría no válida';
  end if;

  select * into v_tx from transactions where id = p_transaction_id and user_id = v_uid for update;
  if not found or v_tx.type <> 'transfer' or v_tx.related_account_id is null then
    raise exception 'Esta transacción no es una transferencia';
  end if;

  perform public.lock_user_accounts(v_uid,
    array[v_tx.account_id, v_tx.related_account_id, p_from_account_id, p_to_account_id]);

  -- Revertir el efecto anterior
  update accounts set current_balance = current_balance + v_tx.amount, updated_at = now() where id = v_tx.account_id;
  update accounts set current_balance = current_balance - v_tx.amount, updated_at = now() where id = v_tx.related_account_id;

  select current_balance into v_balance from accounts where id = p_from_account_id;
  if v_balance < p_amount then
    raise exception 'Saldo insuficiente en la cuenta de origen';  -- revierte toda la función
  end if;

  -- Aplicar el nuevo
  update accounts set current_balance = current_balance - p_amount, updated_at = now() where id = p_from_account_id;
  update accounts set current_balance = current_balance + p_amount, updated_at = now() where id = p_to_account_id;

  update transactions
     set account_id = p_from_account_id,
         related_account_id = p_to_account_id,
         amount = p_amount,
         description = coalesce(nullif(trim(p_description), ''), 'Transferencia'),
         transaction_date = p_transaction_date,
         category_id = p_category_id,
         updated_at = now()
   where id = p_transaction_id;
end;
$$;

create or replace function public.delete_transfer(p_transaction_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := public.transfer_actor(null);
  v_tx transactions%rowtype;
begin
  select * into v_tx from transactions where id = p_transaction_id and user_id = v_uid for update;
  if not found or v_tx.type <> 'transfer' then
    raise exception 'Esta transacción no es una transferencia';
  end if;

  -- Bloquear las cuentas que sigan existiendo (related_account_id puede ser null si se borró)
  perform 1 from accounts
   where id in (v_tx.account_id, v_tx.related_account_id) and user_id = v_uid
   order by id for update;

  delete from transactions where id = p_transaction_id;

  update accounts set current_balance = current_balance + v_tx.amount, updated_at = now()
   where id = v_tx.account_id and user_id = v_uid;
  if v_tx.related_account_id is not null then
    update accounts set current_balance = current_balance - v_tx.amount, updated_at = now()
     where id = v_tx.related_account_id and user_id = v_uid;
  end if;
end;
$$;

revoke execute on function public.transfer_actor(uuid), public.lock_user_accounts(uuid, uuid[]),
  public.create_transfer(uuid, uuid, numeric, date, text, uuid, boolean, uuid),
  public.update_transfer(uuid, uuid, uuid, numeric, date, text, uuid),
  public.delete_transfer(uuid)
  from public, anon;
grant execute on function public.transfer_actor(uuid), public.lock_user_accounts(uuid, uuid[]),
  public.create_transfer(uuid, uuid, numeric, date, text, uuid, boolean, uuid),
  public.update_transfer(uuid, uuid, uuid, numeric, date, text, uuid),
  public.delete_transfer(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. pocket_move: no aceptar movimientos si la cuenta no es visible (antes NULL saltaba el control)
-- ---------------------------------------------------------------------------
create or replace function public.pocket_move(p_pocket_id uuid, p_amount numeric, p_note text default null)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pocket account_pockets%rowtype;
  v_account_balance numeric;
  v_pocketed numeric;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Importe inválido';
  end if;

  select * into v_pocket from account_pockets where id = p_pocket_id for update;
  if not found then
    raise exception 'Apartado no encontrado';
  end if;

  select current_balance into v_account_balance from accounts where id = v_pocket.account_id for update;
  if v_account_balance is null then
    raise exception 'Cuenta no encontrada';
  end if;

  if p_amount > 0 then
    select coalesce(sum(balance), 0) into v_pocketed from account_pockets where account_id = v_pocket.account_id;
    if p_amount > v_account_balance - v_pocketed then
      raise exception 'No hay saldo disponible suficiente en la cuenta';
    end if;
  elsif v_pocket.balance + p_amount < 0 then
    raise exception 'El apartado no tiene saldo suficiente';
  end if;

  update account_pockets set balance = balance + p_amount where id = p_pocket_id;
  insert into pocket_movements (user_id, pocket_id, amount, note)
  values (v_pocket.user_id, p_pocket_id, p_amount, nullif(trim(p_note), ''));

  return v_pocket.balance + p_amount;
end;
$$;

revoke execute on function public.pocket_move(uuid, numeric, text) from public, anon;
grant execute on function public.pocket_move(uuid, numeric, text) to authenticated;

commit;
