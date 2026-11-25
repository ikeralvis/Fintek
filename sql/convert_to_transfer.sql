-- Convierte movimientos mal registrados en una transferencia entre cuentas propias:
--   a) una pareja gasto (cuenta A) + ingreso (cuenta B) del mismo importe, o
--   b) un gasto suelto de la cuenta A, indicando la cuenta de destino B.
-- La transferencia conserva fecha, concepto y categoría del gasto.
--
-- Los saldos NO cambian: se guardan antes y se restauran después (así da igual cómo actúe el
-- trigger de saldos al borrar). Opcionalmente, en el caso b) se puede sumar el importe al
-- destino (p_credit_destination), por si esa cuenta no lo tenía reflejado.
-- Atómico: o se hace todo o nada. Idempotente: se puede re-ejecutar el script.
-- Ejecutar en el SQL Editor de Supabase.

create or replace function public.convert_to_transfer(
  p_expense_id uuid,
  p_income_id uuid default null,
  p_to_account_id uuid default null,
  p_credit_destination boolean default false
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_exp transactions%rowtype;
  v_inc transactions%rowtype;
  v_dest uuid;
  v_src_balance numeric;
  v_dst_balance numeric;
  v_id uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select * into v_exp from transactions where id = p_expense_id and user_id = v_uid for update;
  if not found or v_exp.type <> 'expense' then raise exception 'El movimiento de origen no es un gasto'; end if;

  if p_income_id is not null then
    select * into v_inc from transactions where id = p_income_id and user_id = v_uid for update;
    if not found or v_inc.type <> 'income' then raise exception 'El movimiento de destino no es un ingreso'; end if;
    if abs(v_inc.amount - v_exp.amount) > 0.005 then raise exception 'Los importes no coinciden'; end if;
    v_dest := v_inc.account_id;
  else
    v_dest := p_to_account_id;
  end if;

  if v_dest is null or v_dest = v_exp.account_id then raise exception 'Elige una cuenta de destino distinta'; end if;
  if not exists (select 1 from accounts where id = v_dest and user_id = v_uid) then raise exception 'Cuenta de destino no válida'; end if;

  perform public.lock_user_accounts(v_uid, array[v_exp.account_id, v_dest]);
  select current_balance into v_src_balance from accounts where id = v_exp.account_id;
  select current_balance into v_dst_balance from accounts where id = v_dest;

  delete from transactions where id = v_exp.id;
  if p_income_id is not null then delete from transactions where id = v_inc.id; end if;

  insert into transactions (user_id, type, account_id, related_account_id, amount, description, transaction_date, category_id)
  values (v_uid, 'transfer', v_exp.account_id, v_dest, v_exp.amount,
          coalesce(nullif(trim(v_exp.description), ''), 'Transferencia'), v_exp.transaction_date, v_exp.category_id)
  returning id into v_id;

  update accounts set current_balance = v_src_balance, updated_at = now() where id = v_exp.account_id;
  update accounts
     set current_balance = v_dst_balance + case when p_income_id is null and p_credit_destination then v_exp.amount else 0 end,
         updated_at = now()
   where id = v_dest;

  return v_id;
end;
$$;

revoke execute on function public.convert_to_transfer(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.convert_to_transfer(uuid, uuid, uuid, boolean) to authenticated;
