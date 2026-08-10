-- ============================================================
-- Stores/warehouses: multiple stock locations per property. property_inventory
-- stays as the property-wide aggregate (nothing that reads it needs to
-- change), and this adds a store_inventory breakdown underneath it — every
-- property gets a "Main Store" that all existing/unspecified stock movements
-- keep landing in, so current behavior is unaffected until a second store
-- is added and used.
-- ============================================================

create table stores (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

-- Exactly one default store per property (the fallback target for stock
-- movements that don't specify a store).
create unique index idx_stores_one_default_per_property on stores(property_id) where is_default;
create index idx_stores_property on stores(property_id);

insert into stores (property_id, name, is_default)
select id, 'Main Store', true from properties;

alter table stores enable row level security;
create policy stores_all on stores for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on stores to authenticated;

create trigger trg_audit_stores after insert or update or delete on stores
  for each row execute function log_config_change();

-- ---------- Per-store stock ----------

create table store_inventory (
  store_id uuid not null references stores(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  current_stock numeric(14,3) not null default 0,
  primary key (store_id, inventory_item_id)
);

alter table stock_movements add column store_id uuid references stores(id);

insert into store_inventory (store_id, inventory_item_id, current_stock)
select s.id, pi.inventory_item_id, pi.current_stock
from property_inventory pi
join stores s on s.property_id = pi.property_id and s.is_default;

update stock_movements sm
set store_id = s.id
from stores s
where s.property_id = sm.property_id and s.is_default and sm.store_id is null;

alter table stock_movements enable row level security;
alter table store_inventory enable row level security;
create policy store_inventory_all on store_inventory for all to authenticated using (
  is_staff_for_property((select property_id from stores where id = store_id))
) with check (
  is_staff_for_property((select property_id from stores where id = store_id))
);
grant select, insert, update, delete on store_inventory to authenticated;

-- Defaults a movement's store to its property's default store when the
-- caller doesn't specify one, so existing insert call sites (receive_po_item,
-- receive_stock_transfer, recordStockMovement) keep working unmodified.
create or replace function fill_default_store() returns trigger as $$
begin
  if new.store_id is null then
    select id into new.store_id from stores where property_id = new.property_id and is_default;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_stock_movements_fill_store before insert on stock_movements
  for each row execute function fill_default_store();

-- apply_stock_movement already upserts property_inventory (the aggregate);
-- extend it to also upsert store_inventory (the per-store breakdown) now
-- that every movement carries a resolved store_id.
create or replace function apply_stock_movement() returns trigger as $$
declare
  delta numeric(14,3);
begin
  if new.movement_type = 'adjustment' then
    delta := new.quantity;
  elsif new.movement_type in ('purchase_receipt', 'transfer_in') then
    delta := abs(new.quantity);
  else
    delta := -abs(new.quantity);
  end if;

  insert into property_inventory (property_id, inventory_item_id, current_stock)
  values (new.property_id, new.inventory_item_id, delta)
  on conflict (property_id, inventory_item_id)
  do update set current_stock = property_inventory.current_stock + excluded.current_stock;

  insert into store_inventory (store_id, inventory_item_id, current_stock)
  values (new.store_id, new.inventory_item_id, delta)
  on conflict (store_id, inventory_item_id)
  do update set current_stock = store_inventory.current_stock + excluded.current_stock;

  return new;
end;
$$ language plpgsql set search_path = public;
