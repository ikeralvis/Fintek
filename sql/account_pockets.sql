-- Apartados (pockets): sub-saldos virtuales dentro de una cuenta. NO modifican accounts.current_balance
-- ni son transferencias: solo reparten el saldo existente ("1000 € = 500 viajes + 500 compras").
-- Ejecutar en el SQL Editor de Supabase.

create table public.account_pockets (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  account_id uuid not null,
  name character varying(60) not null,
  color character varying(9) not null default '#6366f1',
  target_amount numeric(12, 2) null,
  balance numeric(12, 2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint account_pockets_pkey primary key (id),
  constraint account_pockets_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint account_pockets_account_id_fkey foreign KEY (account_id) references accounts (id) on delete CASCADE,
  constraint account_pockets_balance_check check (balance >= 0),
  constraint account_pockets_target_check check (target_amount is null or target_amount > 0)
) TABLESPACE pg_default;

create index account_pockets_account_idx on public.account_pockets (account_id);

create table public.pocket_movements (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  pocket_id uuid not null,
  amount numeric(12, 2) not null, -- positivo = añadir, negativo = retirar
  note text null,
  created_at timestamp with time zone not null default now(),
  constraint pocket_movements_pkey primary key (id),
  constraint pocket_movements_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint pocket_movements_pocket_id_fkey foreign KEY (pocket_id) references account_pockets (id) on delete CASCADE,
  constraint pocket_movements_amount_check check (amount <> 0)
) TABLESPACE pg_default;

create index pocket_movements_pocket_idx on public.pocket_movements (pocket_id, created_at desc);

alter table public.account_pockets enable row level security;
alter table public.pocket_movements enable row level security;

drop policy if exists "Users can view own pockets" on account_pockets;
create policy "Users can view own pockets" on account_pockets for select using (user_id = (select auth.uid()));
drop policy if exists "Users can insert own pockets" on account_pockets;
create policy "Users can insert own pockets" on account_pockets for insert with check (user_id = (select auth.uid()));
drop policy if exists "Users can update own pockets" on account_pockets;
create policy "Users can update own pockets" on account_pockets for update using (user_id = (select auth.uid()));
drop policy if exists "Users can delete own pockets" on account_pockets;
create policy "Users can delete own pockets" on account_pockets for delete using (user_id = (select auth.uid()));

drop policy if exists "Users can view own pocket movements" on pocket_movements;
create policy "Users can view own pocket movements" on pocket_movements for select using (user_id = (select auth.uid()));
drop policy if exists "Users can insert own pocket movements" on pocket_movements;
create policy "Users can insert own pocket movements" on pocket_movements for insert with check (user_id = (select auth.uid()));

-- Mover dinero de/hacia un apartado de forma atómica (bloquea filas para evitar carreras).
-- p_amount > 0 añade (limitado al disponible = saldo cuenta − suma de apartados); < 0 retira.
-- SECURITY INVOKER: se aplican las políticas RLS del usuario que llama.
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

grant execute on function public.pocket_move(uuid, numeric, text) to authenticated;
