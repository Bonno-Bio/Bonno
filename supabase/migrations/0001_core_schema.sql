-- KgweboOS core multi-tenant schema
-- Every table carries business_id and is protected by Row Level Security.

create extension if not exists "pgcrypto";

-- ---------- Tenancy ----------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  phone text, email text, address text,
  vat_number text,
  vat_rate numeric(4,3) not null default 0,
  currency text not null default 'BWP',
  created_at timestamptz not null default now()
);

create type user_role as enum ('owner','manager','accountant','salesperson','staff','auditor');

create table memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  role user_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

-- ---------- Billing ----------
create type plan_id as enum ('free','premium');
create type sub_status as enum ('trialing','active','past_due','expired','free');

create table subscriptions (
  business_id uuid primary key references businesses(id) on delete cascade,
  plan plan_id not null default 'free',
  status sub_status not null default 'free',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  provider text,
  last_payment_ref text,
  updated_at timestamptz not null default now()
);

create table payments_billing (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  provider text not null,
  reference text not null unique,        -- idempotency key from webhook
  amount numeric(12,2) not null,
  currency text not null default 'BWP',
  months int not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- Core modules ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, phone text, email text, notes text,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, sku text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2),
  stock_qty numeric(12,3) not null default 0,
  low_stock_threshold numeric(12,3) not null default 0,
  track_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create type stock_movement_type as enum ('purchase','sale','adjustment','return');
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  type stock_movement_type not null,
  qty numeric(12,3) not null,
  note text,
  created_at timestamptz not null default now()
);

create type doc_kind as enum ('invoice','quote');
create type invoice_status as enum ('draft','sent','paid','overdue','void');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind doc_kind not null default 'invoice',
  number text not null,
  customer_id uuid not null references customers(id),
  items jsonb not null default '[]',
  issue_date date not null default current_date,
  due_date date not null,
  status invoice_status not null default 'draft',
  notes text,
  recurring text,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null,
  reference text,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null,
  vendor text, date date not null default current_date, note text, receipt_url text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor uuid references auth.users(id),
  action text not null, entity text not null, entity_id text,
  created_at timestamptz not null default now()
);

create table ai_usage (
  business_id uuid not null references businesses(id) on delete cascade,
  month text not null, -- YYYY-MM
  credits_used int not null default 0,
  primary key (business_id, month)
);

-- ---------- Indexes ----------
create index on customers (business_id);
create index on products (business_id);
create index on stock_movements (business_id, product_id);
create index on invoices (business_id, kind, status);
create index on payments (business_id, invoice_id);
create index on expenses (business_id, date);
create index on audit_logs (business_id, created_at desc);

-- ---------- Row Level Security ----------
create or replace function is_member(b uuid) returns boolean language sql stable as $$
  select exists (select 1 from memberships m where m.business_id = b and m.user_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['customers','products','stock_movements','invoices','payments','expenses','audit_logs','ai_usage','subscriptions','payments_billing']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_tenant_select on %I for select using (is_member(business_id))', t, t);
    execute format('create policy %I_tenant_write  on %I for all    using (is_member(business_id)) with check (is_member(business_id))', t, t);
  end loop;
end $$;

alter table businesses enable row level security;
create policy businesses_member on businesses for select using (is_member(id));
create policy businesses_insert on businesses for insert with check (auth.uid() is not null);
alter table memberships enable row level security;
create policy memberships_self on memberships for select using (user_id = auth.uid() or is_member(business_id));

-- Subscriptions and billing payments may only be written by the service role (webhooks).
drop policy subscriptions_tenant_write on subscriptions;
drop policy payments_billing_tenant_write on payments_billing;
