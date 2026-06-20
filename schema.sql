create table public.transactions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  account_id uuid not null,
  category_id uuid null,
  type character varying(10) not null,
  amount numeric(12, 2) not null,
  description text null,
  transaction_date date not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  related_account_id uuid null,
  constraint transactions_pkey primary key (id),
  constraint transactions_category_id_fkey foreign KEY (category_id) references categories (id) on delete set null,
  constraint transactions_account_id_fkey foreign KEY (account_id) references accounts (id) on delete CASCADE,
  constraint transactions_related_account_id_fkey foreign KEY (related_account_id) references accounts (id) on delete set null,
  constraint transactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint transactions_amount_check check ((amount > (0)::numeric)),
  constraint transactions_type_check check (
    (
      (type)::text = any (
        (
          array[
            'income'::character varying,
            'expense'::character varying,
            'transfer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transactions_related_account_id on public.transactions using btree (related_account_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_user_id on public.transactions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_account_id on public.transactions using btree (account_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_category_id on public.transactions using btree (category_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_date on public.transactions using btree (transaction_date) TABLESPACE pg_default;

create index IF not exists idx_transactions_type on public.transactions using btree (type) TABLESPACE pg_default;

create trigger update_account_balance_trigger
after INSERT
or DELETE
or
update on transactions for EACH row
execute FUNCTION update_account_balance ();

create table public.categories (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name character varying(100) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  icon character varying(10) null default '💰'::character varying,
  color character varying(7) null default '#3B82F6'::character varying,
  constraint categories_pkey primary key (id),
  constraint categories_user_id_name_key unique (user_id, name),
  constraint categories_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_categories_user_id on public.categories using btree (user_id) TABLESPACE pg_default;

create trigger update_categories_updated_at BEFORE
update on categories for EACH row
execute FUNCTION update_updated_at_column ();

create table public.banks (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name character varying(100) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  color text null default '#000000'::text,
  logo_url text null,
  constraint banks_pkey primary key (id),
  constraint banks_user_id_name_key unique (user_id, name),
  constraint banks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_banks_user_id on public.banks using btree (user_id) TABLESPACE pg_default;

create trigger update_banks_updated_at BEFORE
update on banks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.accounts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  bank_id uuid null,
  name character varying(100) not null,
  initial_balance numeric(12, 2) not null default 0,
  current_balance numeric(12, 2) not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_favorite boolean null default false,
  type text null default 'checking'::text,
  is_active boolean null default true,
  constraint accounts_pkey primary key (id),
  constraint accounts_user_id_bank_id_name_key unique (user_id, bank_id, name),
  constraint accounts_bank_id_fkey foreign KEY (bank_id) references banks (id) on delete CASCADE,
  constraint accounts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint accounts_type_check check (
    (
      type = any (
        array[
          'checking'::text,
          'savings'::text,
          'wallet'::text,
          'investment'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_accounts_user_id on public.accounts using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_accounts_bank_id on public.accounts using btree (bank_id) TABLESPACE pg_default;

create index IF not exists idx_accounts_is_active on public.accounts using btree (user_id, is_active) TABLESPACE pg_default;

create trigger update_accounts_updated_at BEFORE
update on accounts for EACH row
execute FUNCTION update_updated_at_column ();


create table public.recurring_transactions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  account_id uuid not null,
  category_id uuid null,
  amount numeric(12, 2) not null,
  type text not null,
  description text null,
  frequency text not null,
  start_date date not null default CURRENT_DATE,
  next_run_date date not null,
  active boolean null default true,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint recurring_transactions_pkey primary key (id),
  constraint recurring_transactions_category_id_fkey foreign KEY (category_id) references categories (id) on delete set null,
  constraint recurring_transactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint recurring_transactions_account_id_fkey foreign KEY (account_id) references accounts (id) on delete CASCADE,
  constraint recurring_transactions_frequency_check check (
    (
      frequency = any (
        array['monthly'::text, 'weekly'::text, 'yearly'::text]
      )
    )
  ),
  constraint recurring_transactions_amount_check check ((amount > (0)::numeric)),
  constraint recurring_transactions_type_check check (
    (
      type = any (array['income'::text, 'expense'::text])
    )
  )
) TABLESPACE pg_default;


create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  amount numeric not null,
  currency text not null default 'EUR'::text,
  billing_cycle text not null,
  next_payment_date date not null,
  category_id uuid null,
  logo_url text null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  account_id uuid null,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_account_id_fkey foreign KEY (account_id) references accounts (id) on delete set null,
  constraint subscriptions_category_id_fkey foreign KEY (category_id) references categories (id) on delete set null,
  constraint subscriptions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint subscriptions_billing_cycle_check check (
    (
      billing_cycle = any (
        array[
          'monthly'::text,
          'yearly'::text,
          'weekly'::text,
          'bi-weekly'::text
        ]
      )
    )
  ),
  constraint subscriptions_status_check check (
    (
      status = any (
        array['active'::text, 'paused'::text, 'cancelled'::text]
      )
    )
  )
) TABLESPACE pg_default;