-- ============================================================
-- Kitchens, service areas, cross-property kitchen serving,
-- and inter-property inventory transfers.
-- ============================================================

-- ---------- Kitchens ----------

-- A kitchen is not owned by a single property (kitchen_properties below
-- says which propert(ies) it serves) so it can be a genuine central kitchen.
create table kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_central boolean not null default false,
  created_at timestamptz not null default now()
);

create table kitchen_properties (
  kitchen_id uuid not null references kitchens(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  primary key (kitchen_id, property_id)
);

-- Which kitchen prepares a given menu category's items — lets one kitchen
-- serve multiple restaurants (their categories all point at it) including
-- restaurants at different properties, when the kitchen is central.
alter table menu_categories add column kitchen_id uuid references kitchens(id);
create index idx_menu_categories_kitchen on menu_categories(kitchen_id);

-- ---------- Service areas ----------

create table service_areas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

alter table restaurant_tables add column service_area_id uuid references service_areas(id);
create index idx_restaurant_tables_service_area on restaurant_tables(service_area_id);

-- ---------- RLS: kitchens / kitchen_properties / service_areas ----------

alter table kitchens enable row level security;
create policy kitchens_read on kitchens for select to authenticated using (is_staff());
create policy kitchens_admin_write on kitchens for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on kitchens to authenticated;

alter table kitchen_properties enable row level security;
create policy kitchen_properties_read on kitchen_properties for select to authenticated using (is_staff());
create policy kitchen_properties_admin_write on kitchen_properties for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on kitchen_properties to authenticated;

alter table service_areas enable row level security;
create policy service_areas_read on service_areas for select to authenticated using (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
);
create policy service_areas_write on service_areas for all to authenticated using (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
) with check (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
);
grant select, insert, update, delete on service_areas to authenticated;

-- ---------- Kitchen-network visibility on orders/order_items ----------

-- A chef whose home property shares a central kitchen with another
-- property can see and update that property's kitchen tickets too — a
-- narrow, kitchen-specific exception to normal one-property-per-staff
-- scoping, not a general multi-property grant.
create or replace function is_kitchen_network_staff(p_property_id uuid) returns boolean as $$
  select exists (
    select 1 from profiles pr
    where pr.id = auth.uid() and pr.active = true
      and (
        pr.role = 'admin'
        or pr.property_id = p_property_id
        or (
          pr.role = 'chef'
          and exists (
            select 1 from kitchen_properties kp_mine
            join kitchen_properties kp_target on kp_target.kitchen_id = kp_mine.kitchen_id
            where kp_mine.property_id = pr.property_id
              and kp_target.property_id = p_property_id
          )
        )
      )
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_kitchen_network_staff(uuid) to authenticated;

drop policy if exists orders_property_all on orders;
create policy orders_kitchen_network_all on orders for all to authenticated
  using (is_kitchen_network_staff(property_id)) with check (is_kitchen_network_staff(property_id));

drop policy if exists "order_items_staff_all" on order_items;
create policy order_items_kitchen_network_all on order_items for all to authenticated using (
  is_kitchen_network_staff((select property_id from orders where id = order_id))
) with check (
  is_kitchen_network_staff((select property_id from orders where id = order_id))
);

-- ---------- Inter-property inventory transfers ----------

create type transfer_status as enum ('requested', 'in_transit', 'received', 'cancelled');

create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique default next_doc_number('TRF', 'stock_transfer_seq'),
  from_property_id uuid not null references properties(id),
  to_property_id uuid not null references properties(id),
  status transfer_status not null default 'requested',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_property_id <> to_property_id)
);

create table stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references stock_transfers(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  quantity numeric(14,3) not null check (quantity > 0)
);

create index idx_stock_transfers_from on stock_transfers(from_property_id);
create index idx_stock_transfers_to on stock_transfers(to_property_id);
create index idx_stock_transfer_items_transfer on stock_transfer_items(transfer_id);

create trigger trg_stock_transfers_updated before update on stock_transfers
  for each row execute function set_updated_at();

alter type stock_movement_type add value if not exists 'transfer_out';
alter type stock_movement_type add value if not exists 'transfer_in';

-- transfer_out/transfer_in are direction-aware: unlike consumption/wastage
-- (always a deduction) transfer_in must add stock, so it can't share their
-- "always subtract" branch.
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

  return new;
end;
$$ language plpgsql set search_path = public;

-- Marking a transfer received posts the debit at the source and the credit
-- at the destination together, atomically.
create or replace function receive_stock_transfer(p_transfer_id uuid, p_staff_id uuid)
returns void as $$
declare
  v_from uuid;
  v_to uuid;
  v_status transfer_status;
  item record;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select from_property_id, to_property_id, status into v_from, v_to, v_status
  from stock_transfers where id = p_transfer_id;

  if v_status = 'received' then
    raise exception 'Transfer already received';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Transfer was cancelled';
  end if;

  for item in select inventory_item_id, quantity from stock_transfer_items where transfer_id = p_transfer_id loop
    insert into stock_movements (property_id, inventory_item_id, movement_type, quantity, reference_table, reference_id, created_by)
    values (v_from, item.inventory_item_id, 'transfer_out', item.quantity, 'stock_transfers', p_transfer_id, p_staff_id);

    insert into stock_movements (property_id, inventory_item_id, movement_type, quantity, reference_table, reference_id, created_by)
    values (v_to, item.inventory_item_id, 'transfer_in', item.quantity, 'stock_transfers', p_transfer_id, p_staff_id);
  end loop;

  update stock_transfers set status = 'received' where id = p_transfer_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function receive_stock_transfer(uuid, uuid) to authenticated;

-- Staff at either end of a transfer (source or destination property) can
-- see and act on it; admin always can.
create or replace function is_staff_for_transfer(p_from uuid, p_to uuid) returns boolean as $$
  select is_staff_for_property(p_from) or is_staff_for_property(p_to);
$$ language sql stable security definer set search_path = public;

grant execute on function is_staff_for_transfer(uuid, uuid) to authenticated;

alter table stock_transfers enable row level security;
create policy stock_transfers_all on stock_transfers for all to authenticated
  using (is_staff_for_transfer(from_property_id, to_property_id))
  with check (is_staff_for_transfer(from_property_id, to_property_id));
grant select, insert, update, delete on stock_transfers to authenticated;

alter table stock_transfer_items enable row level security;
create policy stock_transfer_items_all on stock_transfer_items for all to authenticated using (
  is_staff_for_transfer(
    (select from_property_id from stock_transfers where id = transfer_id),
    (select to_property_id from stock_transfers where id = transfer_id)
  )
) with check (
  is_staff_for_transfer(
    (select from_property_id from stock_transfers where id = transfer_id),
    (select to_property_id from stock_transfers where id = transfer_id)
  )
);
grant select, insert, update, delete on stock_transfer_items to authenticated;
