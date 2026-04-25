create table if not exists consumers (
  id bigserial primary key,
  account_no text unique not null,
  name text not null,
  address text,
  meter_no text,
  created_at timestamptz default now()
);

create table if not exists billing_periods (
  id bigserial primary key,
  period text unique not null,
  created_at timestamptz default now()
);

create table if not exists bills (
  id bigserial primary key,
  period text not null,
  as_of date,
  account_no text,
  name text,
  address text,
  meter_no text,
  period_from date,
  period_to date,
  due_date date,
  disconnection_date date,
  present numeric default 0,
  previous numeric default 0,
  rate numeric default 0,
  assoc numeric default 0,
  previous_account numeric default 0,
  previous_months text,
  receiver text,
  status text default 'Unpaid',
  created_at timestamptz default now()
);

create table if not exists payments (
  id bigserial primary key,
  account_no text not null,
  payment_date date,
  amount numeric default 0,
  reference text,
  created_at timestamptz default now()
);

create table if not exists business_info (
  id integer primary key default 1 check (id = 1),
  name text,
  address text,
  contact text
);
