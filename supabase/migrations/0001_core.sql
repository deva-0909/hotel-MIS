-- ============================================================
-- Hotel & Restaurant MS — Core schema: staff profiles
-- ============================================================

create extension if not exists "pgcrypto";

create type staff_role as enum (
  'admin', 'front_office', 'restaurant_manager', 'waiter', 'chef',
  'housekeeping', 'inventory_manager', 'accountant'
);

-- Staff profiles, one row per auth.users member
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role staff_role not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reused by later migrations for updated_at columns
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Generic daily/sequential document number generator, e.g. RES-000123
create or replace function next_doc_number(prefix text, seq_name text) returns text as $$
declare
  n bigint;
begin
  execute format('create sequence if not exists %I', seq_name);
  execute format('select nextval(%L)', seq_name) into n;
  return prefix || '-' || lpad(n::text, 6, '0');
end;
$$ language plpgsql;
