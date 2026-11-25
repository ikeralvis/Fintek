-- Comprobaciones de seguridad (solo lectura). Ejecutar en el SQL Editor de Supabase y revisar
-- cada resultado. Ninguna de estas consultas modifica nada.

-- 1) Tablas de `public` SIN Row Level Security. Debe devolver 0 filas.
--    Cualquier fila aquí = cualquiera con la anon key (pública) puede leer/escribir esa tabla.
select c.relname as tabla_sin_rls
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and not c.relrowsecurity
order by 1;

-- 2) Tablas con RLS activada pero SIN ninguna política (nadie salvo service_role puede usarlas;
--    no es un agujero, pero suele indicar algo roto).
select c.relname as tabla_rls_sin_politicas
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
order by 1;

-- 3) Todas las políticas, para revisarlas a mano. Fíjate en:
--    - roles = {public} o {anon} con qual = true  → acceso abierto.
--    - cmd = INSERT/UPDATE cuyo with_check no compruebe la propiedad de account_id/category_id
--      (después de aplicar 2026-11_security_hardening.sql deberían usar owns_account/owns_category).
select tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 4) Trigger de saldo: ¿es SECURITY DEFINER? (prosecdef = true) y su código fuente.
--    Si es DEFINER y no comprueba el dueño de la cuenta, el arreglo de políticas de
--    2026-11_security_hardening.sql es lo que impide que se usen cuentas ajenas.
select p.proname, p.prosecdef as security_definer, p.proconfig as config, p.prosrc as codigo
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('update_account_balance', 'pocket_move', 'create_transfer', 'update_transfer', 'delete_transfer');

-- 5) Todas las funciones SECURITY DEFINER de `public` (se saltan RLS: revisar cada una).
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.proconfig as config
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.prosecdef
order by 1;

-- 6) Triggers de `public` (para ver qué tablas tienen lógica que no está en el repo).
select event_object_table as tabla, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by 1, 2;

-- 7) Datos ya existentes que apuntan a cuentas/categorías de OTRO usuario (resultado de un
--    posible abuso previo). Debe devolver 0 en todas las filas.
select 'transactions.account_id' as referencia, count(*) from transactions t join accounts a on a.id = t.account_id where a.user_id <> t.user_id
union all select 'transactions.related_account_id', count(*) from transactions t join accounts a on a.id = t.related_account_id where a.user_id <> t.user_id
union all select 'transactions.category_id', count(*) from transactions t join categories c on c.id = t.category_id where c.user_id <> t.user_id
union all select 'subscriptions.account_id', count(*) from subscriptions s join accounts a on a.id = s.account_id where a.user_id <> s.user_id
union all select 'subscriptions.to_account_id', count(*) from subscriptions s join accounts a on a.id = s.to_account_id where a.user_id <> s.user_id
union all select 'recurring_transactions.account_id', count(*) from recurring_transactions r join accounts a on a.id = r.account_id where a.user_id <> r.user_id
union all select 'account_pockets.account_id', count(*) from account_pockets p join accounts a on a.id = p.account_id where a.user_id <> p.user_id;

-- 8) Comprobación PREVIA a 2026-11_security_hardening.sql: el resto de referencias que la
--    migración empezará a exigir. Si alguna da > 0, esas filas seguirán existiendo y leyéndose,
--    pero no se podrán EDITAR hasta corregirlas. Todas deberían dar 0.
--    Si da error "column does not exist", borra esa línea: esa tabla no tiene esa columna.
select 'accounts.bank_id' as referencia, count(*) from accounts x join banks b on b.id = x.bank_id where b.user_id <> x.user_id
union all select 'budgets.category_id', count(*) from budgets x join categories c on c.id = x.category_id where c.user_id <> x.user_id
union all select 'budget_rollover_actions.category_id', count(*) from budget_rollover_actions x join categories c on c.id = x.category_id where c.user_id <> x.user_id
union all select 'investment_snapshots.account_id', count(*) from investment_snapshots x join accounts a on a.id = x.account_id where a.user_id <> x.user_id
union all select 'subscriptions.category_id', count(*) from subscriptions x join categories c on c.id = x.category_id where c.user_id <> x.user_id
union all select 'recurring_transactions.category_id', count(*) from recurring_transactions x join categories c on c.id = x.category_id where c.user_id <> x.user_id
union all select 'pocket_movements.pocket_id', count(*) from pocket_movements x join account_pockets p on p.id = x.pocket_id where p.user_id <> x.user_id;

-- 9) Columnas que la migración va a comprobar, tabla por tabla (para saber exactamente qué cambia).
select table_name, string_agg(column_name, ', ' order by column_name) as columnas_fk_comprobadas
from information_schema.columns
where table_schema = 'public'
  and column_name in ('account_id', 'to_account_id', 'related_account_id', 'category_id', 'bank_id', 'pocket_id')
  and table_name in (select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id')
group by table_name
order by 1;
