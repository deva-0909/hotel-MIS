-- ============================================================
-- POS terminal registry: named checkout terminals at a property, optionally
-- tied to a restaurant, so orders/invoices can note which terminal they
-- were billed at.
-- ============================================================

create table pos_terminals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete set null,
  name text not null,
  identifier text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

create index idx_pos_terminals_property on pos_terminals(property_id);
create index idx_pos_terminals_restaurant on pos_terminals(restaurant_id);

alter table pos_terminals enable row level security;
create policy pos_terminals_all on pos_terminals for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on pos_terminals to authenticated;

create trigger trg_audit_pos_terminals after insert or update or delete on pos_terminals
  for each row execute function log_config_change();

-- Records which terminal an order was billed at (optional — orders created
-- before this migration, or billed without picking a terminal, stay null).
alter table orders add column pos_terminal_id uuid references pos_terminals(id) on delete set null;
