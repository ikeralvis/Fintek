-- Tabla que falta en la base de datos: la usan getHandledRolloverKeys() y recordRolloverAction()
-- en lib/actions/budgets.ts, pero nunca se creó en Supabase (de ahí el error "Could not find
-- the table 'public.budget_rollover_actions' in the schema cache"). Ejecutar en el SQL Editor
-- de Supabase.

create table public.budget_rollover_actions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  category_id uuid not null,
  month_key character varying(7) not null, -- formato 'YYYY-MM'
  action character varying(20) not null,
  surplus numeric(12, 2) not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint budget_rollover_actions_pkey primary key (id),
  constraint budget_rollover_actions_user_category_month_key unique (user_id, category_id, month_key),
  constraint budget_rollover_actions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint budget_rollover_actions_category_id_fkey foreign KEY (category_id) references categories (id) on delete CASCADE,
  constraint budget_rollover_actions_action_check check (
    (action)::text = any (
      (array['rollover'::character varying, 'auto_savings'::character varying, 'dismissed'::character varying])::text[]
    )
  )
) TABLESPACE pg_default;

alter table public.budget_rollover_actions enable row level security;

drop policy if exists "Users can view own rollover actions" on budget_rollover_actions;
create policy "Users can view own rollover actions" on budget_rollover_actions for select using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own rollover actions" on budget_rollover_actions;
create policy "Users can insert own rollover actions" on budget_rollover_actions for insert with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own rollover actions" on budget_rollover_actions;
create policy "Users can update own rollover actions" on budget_rollover_actions for update using (user_id = (select auth.uid()));

drop policy if exists "Users can delete own rollover actions" on budget_rollover_actions;
create policy "Users can delete own rollover actions" on budget_rollover_actions for delete using (user_id = (select auth.uid()));
