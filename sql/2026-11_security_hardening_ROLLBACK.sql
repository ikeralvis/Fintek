-- =====================================================================================
-- MARCHA ATRÁS de 2026-11_security_hardening.sql (solo si algo deja de funcionar).
-- Restaura EXACTAMENTE las políticas RLS que había el 25/11/2026 (copiadas de la salida de
-- security_checks.sql, consulta 3), incluidas las duplicadas.
--
-- No borra las funciones nuevas (owns_*, create/update/delete_transfer…): sin políticas que
-- las usen no hacen nada, y el código desplegado de transferencias las necesita.
-- OJO: al volver a estas políticas, vuelve a estar abierto el hallazgo F-01 (referenciar
-- cuentas/categorías de otro usuario). Es una vía de escape temporal, no un estado final.
-- =====================================================================================

begin;

-- 1. Quitar las políticas creadas por la migración
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and policyname in ('own_select', 'own_insert', 'own_update', 'own_delete')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 2. Restaurar las políticas originales

-- account_pockets
create policy "Users can delete own pockets" on public.account_pockets for delete using (user_id = (select auth.uid()));
create policy "Users can insert own pockets" on public.account_pockets for insert with check (user_id = (select auth.uid()));
create policy "Users can view own pockets" on public.account_pockets for select using (user_id = (select auth.uid()));
create policy "Users can update own pockets" on public.account_pockets for update using (user_id = (select auth.uid()));

-- accounts
create policy "Users can delete own accounts" on public.accounts for delete using (user_id = (select auth.uid()));
create policy "Users can delete their own accounts" on public.accounts for delete using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (user_id = (select auth.uid()));
create policy "Users can insert their own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can view own accounts" on public.accounts for select using (user_id = (select auth.uid()));
create policy "Users can view their own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (user_id = (select auth.uid()));
create policy "Users can update their own accounts" on public.accounts for update using (auth.uid() = user_id);

-- banks
create policy "Users can delete own banks" on public.banks for delete using (user_id = (select auth.uid()));
create policy "Users can delete their own banks" on public.banks for delete using (auth.uid() = user_id);
create policy "Users can insert own banks" on public.banks for insert with check (user_id = (select auth.uid()));
create policy "Users can insert their own banks" on public.banks for insert with check (auth.uid() = user_id);
create policy "Users can view own banks" on public.banks for select using (user_id = (select auth.uid()));
create policy "Users can view their own banks" on public.banks for select using (auth.uid() = user_id);
create policy "Users can update own banks" on public.banks for update using (user_id = (select auth.uid()));
create policy "Users can update their own banks" on public.banks for update using (auth.uid() = user_id);

-- budget_rollover_actions
create policy "Users can delete own rollover actions" on public.budget_rollover_actions for delete using (user_id = (select auth.uid()));
create policy "Users can insert own rollover actions" on public.budget_rollover_actions for insert with check (user_id = (select auth.uid()));
create policy "Users can view own rollover actions" on public.budget_rollover_actions for select using (user_id = (select auth.uid()));
create policy "Users can update own rollover actions" on public.budget_rollover_actions for update using (user_id = (select auth.uid()));

-- budget_settings (no tenía política DELETE)
create policy "Users can insert their own budget settings" on public.budget_settings for insert with check (user_id = (select auth.uid()));
create policy "Users can view their own budget settings" on public.budget_settings for select using (user_id = (select auth.uid()));
create policy "Users can update their own budget settings" on public.budget_settings for update using (user_id = (select auth.uid()));

-- budgets
create policy "Users can delete own" on public.budgets for delete using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (user_id = (select auth.uid()));
create policy "Users can delete their own budgets" on public.budgets for delete using (auth.uid() = user_id);
create policy "Users can insert own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (user_id = (select auth.uid()));
create policy "Users can insert their own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can view own" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can view own budgets" on public.budgets for select using (user_id = (select auth.uid()));
create policy "Users can view their own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can update own" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (user_id = (select auth.uid()));
create policy "Users can update their own budgets" on public.budgets for update using (auth.uid() = user_id);

-- categories
create policy "Users can delete own categories" on public.categories for delete using (user_id = (select auth.uid()));
create policy "Users can delete their own categories" on public.categories for delete using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (user_id = (select auth.uid()));
create policy "Users can insert their own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can view own categories" on public.categories for select using (user_id = (select auth.uid()));
create policy "Users can view their own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (user_id = (select auth.uid()));
create policy "Users can update their own categories" on public.categories for update using (auth.uid() = user_id);

-- investment_contributions
create policy "Users can delete their own investment contributions" on public.investment_contributions for delete using (user_id = (select auth.uid()));
create policy "Users can insert their own investment contributions" on public.investment_contributions for insert with check (user_id = (select auth.uid()));
create policy "Users can view their own investment contributions" on public.investment_contributions for select using (user_id = (select auth.uid()));
create policy "Users can update their own investment contributions" on public.investment_contributions for update using (user_id = (select auth.uid()));

-- investment_snapshots (rol authenticated)
create policy "Usuarios pueden borrar sus propios snapshots" on public.investment_snapshots for delete to authenticated using (auth.uid() = user_id);
create policy "Usuarios pueden insertar sus propios snapshots" on public.investment_snapshots for insert to authenticated with check (auth.uid() = user_id);
create policy "Usuarios pueden ver sus propios snapshots" on public.investment_snapshots for select to authenticated using (auth.uid() = user_id);
create policy "Usuarios pueden actualizar sus propios snapshots" on public.investment_snapshots for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification_settings
create policy "Users can delete own notification_settings" on public.notification_settings for delete using (user_id = (select auth.uid()));
create policy "Users can insert own notification_settings" on public.notification_settings for insert with check (user_id = (select auth.uid()));
create policy "Users can view own notification_settings" on public.notification_settings for select using (user_id = (select auth.uid()));
create policy "Users can update own notification_settings" on public.notification_settings for update using (user_id = (select auth.uid()));

-- pocket_movements
create policy "Users can insert own pocket movements" on public.pocket_movements for insert with check (user_id = (select auth.uid()));
create policy "Users can view own pocket movements" on public.pocket_movements for select using (user_id = (select auth.uid()));

-- push_subscriptions
create policy "Users can delete own push_subscriptions" on public.push_subscriptions for delete using (user_id = (select auth.uid()));
create policy "Users can insert own push_subscriptions" on public.push_subscriptions for insert with check (user_id = (select auth.uid()));
create policy "Users can view own push_subscriptions" on public.push_subscriptions for select using (user_id = (select auth.uid()));
create policy "Users can update own push_subscriptions" on public.push_subscriptions for update using (user_id = (select auth.uid()));

-- recurring_transactions
create policy "Users can delete own recurring_transactions" on public.recurring_transactions for delete using (user_id = (select auth.uid()));
create policy "Users can insert own recurring_transactions" on public.recurring_transactions for insert with check (user_id = (select auth.uid()));
create policy "Users can view own recurring_transactions" on public.recurring_transactions for select using (user_id = (select auth.uid()));
create policy "Users can update own recurring_transactions" on public.recurring_transactions for update using (user_id = (select auth.uid()));

-- subscriptions
create policy "Users can delete their own subscriptions" on public.subscriptions for delete using (auth.uid() = user_id);
create policy "Users can insert their own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can view their own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can update their own subscriptions" on public.subscriptions for update using (auth.uid() = user_id);

-- transactions
create policy "Users can delete own transactions" on public.transactions for delete using (user_id = (select auth.uid()));
create policy "Users can delete their own transactions" on public.transactions for delete using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (user_id = (select auth.uid()));
create policy "Users can insert their own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can view own transactions" on public.transactions for select using (user_id = (select auth.uid()));
create policy "Users can view their own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (user_id = (select auth.uid()));
create policy "Users can update their own transactions" on public.transactions for update using (auth.uid() = user_id);

commit;
