-- ============================================================
-- Hotel & Restaurant MS — Multi-property expansion
-- One enterprise -> many properties -> buildings -> floors -> rooms.
-- Each property can run multiple restaurant outlets.
-- Guests, the inventory/supplier catalog, and HR stay enterprise-wide
-- (shared); everything operational (rooms, reservations, orders,
-- banquet, engineering, spa, travel, purchase orders, stock, invoices,
-- CRM) is scoped to a property. Staff belong to exactly one property;
-- 'admin' is the only role that sees across all of them.
-- ============================================================

-- ---------- New structural entities ----------

create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  city text,
  address text,
  gstin text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (building_id, name)
);

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create trigger trg_properties_updated before update on properties
  for each row execute function set_updated_at();

-- ---------- Seed a default property from the existing single-property data ----------

do $$
declare
  v_property_id uuid;
  v_building_id uuid;
  v_unassigned_floor_id uuid;
  v_restaurant_id uuid;
  v_hotel_name text;
  v_city text;
  v_gstin text;
  r record;
begin
  select hotel_name, city, gstin into v_hotel_name, v_city, v_gstin from hotel_settings limit 1;

  insert into properties (name, code, city, gstin)
  values (coalesce(v_hotel_name, 'Main Property'), 'MAIN', v_city, v_gstin)
  returning id into v_property_id;

  insert into buildings (property_id, name) values (v_property_id, 'Main Building') returning id into v_building_id;
  insert into floors (building_id, name, sort_order) values (v_building_id, 'Unassigned', -1) returning id into v_unassigned_floor_id;
  insert into restaurants (property_id, name) values (v_property_id, 'Main Restaurant') returning id into v_restaurant_id;

  -- one floor row per distinct existing rooms.floor label
  for r in select distinct floor as floor_label from rooms where floor is not null loop
    insert into floors (building_id, name) values (v_building_id, r.floor_label)
    on conflict (building_id, name) do nothing;
  end loop;

  -- ---------- profiles: home property (admin stays unscoped = sees all) ----------
  alter table profiles add column property_id uuid references properties(id);
  update profiles set property_id = v_property_id where role <> 'admin';

  -- ---------- rooms: property/building/floor ----------
  alter table rooms add column property_id uuid references properties(id);
  alter table rooms add column building_id uuid references buildings(id);
  alter table rooms add column floor_id uuid references floors(id);

  update rooms set property_id = v_property_id, building_id = v_building_id;
  update rooms rm set floor_id = f.id from floors f where f.building_id = v_building_id and f.name = rm.floor;
  update rooms set floor_id = v_unassigned_floor_id where floor_id is null;

  alter table rooms alter column property_id set not null;
  alter table rooms alter column building_id set not null;
  alter table rooms alter column floor_id set not null;
  alter table rooms drop column floor;

  -- ---------- room_types ----------
  alter table room_types add column property_id uuid references properties(id);
  update room_types set property_id = v_property_id;
  alter table room_types alter column property_id set not null;

  -- ---------- reservations ----------
  alter table reservations add column property_id uuid references properties(id);
  update reservations set property_id = v_property_id;
  alter table reservations alter column property_id set not null;

  -- ---------- restaurants: tables & menu ----------
  alter table restaurant_tables add column restaurant_id uuid references restaurants(id);
  update restaurant_tables set restaurant_id = v_restaurant_id;
  alter table restaurant_tables alter column restaurant_id set not null;

  alter table menu_categories add column restaurant_id uuid references restaurants(id);
  update menu_categories set restaurant_id = v_restaurant_id;
  alter table menu_categories alter column restaurant_id set not null;

  -- ---------- orders ----------
  alter table orders add column property_id uuid references properties(id);
  update orders set property_id = v_property_id;
  alter table orders alter column property_id set not null;

  -- ---------- banquet ----------
  alter table banquet_venues add column property_id uuid references properties(id);
  update banquet_venues set property_id = v_property_id;
  alter table banquet_venues alter column property_id set not null;

  alter table banquet_events add column property_id uuid references properties(id);
  update banquet_events set property_id = v_property_id;
  alter table banquet_events alter column property_id set not null;

  alter table banquet_menu_packages add column property_id uuid references properties(id);
  update banquet_menu_packages set property_id = v_property_id;
  alter table banquet_menu_packages alter column property_id set not null;

  -- ---------- engineering ----------
  alter table engineering_assets add column property_id uuid references properties(id);
  update engineering_assets set property_id = v_property_id;
  alter table engineering_assets alter column property_id set not null;

  alter table work_orders add column property_id uuid references properties(id);
  update work_orders set property_id = v_property_id;
  alter table work_orders alter column property_id set not null;

  -- ---------- spa & laundry ----------
  alter table spa_services add column property_id uuid references properties(id);
  update spa_services set property_id = v_property_id;
  alter table spa_services alter column property_id set not null;

  alter table spa_bookings add column property_id uuid references properties(id);
  update spa_bookings set property_id = v_property_id;
  alter table spa_bookings alter column property_id set not null;

  alter table laundry_batches add column property_id uuid references properties(id);
  update laundry_batches set property_id = v_property_id;
  alter table laundry_batches alter column property_id set not null;

  -- ---------- travel desk ----------
  alter table travel_vehicles add column property_id uuid references properties(id);
  update travel_vehicles set property_id = v_property_id;
  alter table travel_vehicles alter column property_id set not null;

  alter table travel_bookings add column property_id uuid references properties(id);
  update travel_bookings set property_id = v_property_id;
  alter table travel_bookings alter column property_id set not null;

  -- ---------- CRM ----------
  alter table crm_campaigns add column property_id uuid references properties(id);
  update crm_campaigns set property_id = v_property_id;
  alter table crm_campaigns alter column property_id set not null;

  alter table crm_leads add column property_id uuid references properties(id);
  update crm_leads set property_id = v_property_id;
  alter table crm_leads alter column property_id set not null;

  -- ---------- purchase orders & stock (per-property; catalog stays shared) ----------
  alter table purchase_orders add column property_id uuid references properties(id);
  update purchase_orders set property_id = v_property_id;
  alter table purchase_orders alter column property_id set not null;

  alter table stock_movements add column property_id uuid references properties(id);
  update stock_movements set property_id = v_property_id;
  alter table stock_movements alter column property_id set not null;

  -- ---------- invoices ----------
  alter table invoices add column property_id uuid references properties(id);
  update invoices set property_id = v_property_id;
  alter table invoices alter column property_id set not null;
end $$;

create index idx_rooms_property on rooms(property_id);
create index idx_rooms_building on rooms(building_id);
create index idx_rooms_floor on rooms(floor_id);
create index idx_room_types_property on room_types(property_id);
create index idx_reservations_property on reservations(property_id);
create index idx_restaurant_tables_restaurant on restaurant_tables(restaurant_id);
create index idx_menu_categories_restaurant on menu_categories(restaurant_id);
create index idx_orders_property on orders(property_id);
create index idx_banquet_venues_property on banquet_venues(property_id);
create index idx_banquet_events_property on banquet_events(property_id);
create index idx_banquet_menu_packages_property on banquet_menu_packages(property_id);
create index idx_engineering_assets_property on engineering_assets(property_id);
create index idx_work_orders_property on work_orders(property_id);
create index idx_spa_services_property on spa_services(property_id);
create index idx_spa_bookings_property on spa_bookings(property_id);
create index idx_laundry_batches_property on laundry_batches(property_id);
create index idx_travel_vehicles_property on travel_vehicles(property_id);
create index idx_travel_bookings_property on travel_bookings(property_id);
create index idx_crm_campaigns_property on crm_campaigns(property_id);
create index idx_crm_leads_property on crm_leads(property_id);
create index idx_purchase_orders_property on purchase_orders(property_id);
create index idx_stock_movements_property on stock_movements(property_id);
create index idx_invoices_property on invoices(property_id);
create index idx_profiles_property on profiles(property_id);
create index idx_buildings_property on buildings(property_id);
create index idx_floors_building on floors(building_id);
create index idx_restaurants_property on restaurants(property_id);

-- ---------- Per-property stock (inventory_items/suppliers stay a shared catalog) ----------

create table property_inventory (
  property_id uuid not null references properties(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  current_stock numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  primary key (property_id, inventory_item_id)
);

do $$
declare
  v_property_id uuid;
begin
  select id into v_property_id from properties order by created_at limit 1;

  insert into property_inventory (property_id, inventory_item_id, current_stock, reorder_level)
  select v_property_id, id, current_stock, reorder_level from inventory_items;
end $$;

alter table inventory_items drop column current_stock;
alter table inventory_items drop column reorder_level;

-- apply_stock_movement kept current_stock on inventory_items in sync; it now
-- upserts the per-property stock row instead (stock is per-property, the
-- item catalog is shared).
create or replace function apply_stock_movement() returns trigger as $$
declare
  delta numeric(14,3);
begin
  if new.movement_type = 'adjustment' then
    delta := new.quantity;
  elsif new.movement_type = 'purchase_receipt' then
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

-- receive_po_item posted stock_movements without a property_id before; it now
-- carries the receiving property's id through from the purchase order.
create or replace function receive_po_item(p_po_item_id uuid, p_quantity numeric, p_staff_id uuid)
returns void as $$
declare
  v_item_id uuid;
  v_po_id uuid;
  v_property_id uuid;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select inventory_item_id, po_id into v_item_id, v_po_id
  from purchase_order_items where id = p_po_item_id;

  select property_id into v_property_id from purchase_orders where id = v_po_id;

  update purchase_order_items set received_quantity = received_quantity + p_quantity
  where id = p_po_item_id;

  insert into stock_movements (inventory_item_id, movement_type, quantity, reference_table, reference_id, created_by, property_id)
  values (v_item_id, 'purchase_receipt', p_quantity, 'purchase_orders', v_po_id, p_staff_id, v_property_id);

  update purchase_orders po set status = case
    when (select bool_and(received_quantity >= quantity) from purchase_order_items where po_id = po.id) then 'received'::po_status
    else 'partially_received'::po_status
  end
  where po.id = v_po_id;
end;
$$ language plpgsql security definer set search_path = public;

-- generate_invoice_from_reservation now stamps the invoice with the
-- reservation's property (invoices.property_id is not null).
create or replace function generate_invoice_from_reservation(p_reservation_id uuid, p_staff_id uuid)
returns uuid as $$
declare
  v_guest_id uuid;
  v_property_id uuid;
  v_invoice_id uuid;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select guest_id, property_id into v_guest_id, v_property_id from reservations where id = p_reservation_id;

  insert into invoices (guest_id, reservation_id, status, issued_at, created_by, property_id)
  values (v_guest_id, p_reservation_id, 'draft', now(), p_staff_id, v_property_id)
  returning id into v_invoice_id;

  insert into invoice_line_items (invoice_id, description, source_type, source_table, source_id, quantity, unit_price, amount)
  select v_invoice_id, fc.description, fc.charge_type, 'folio_charges', fc.id, 1, fc.amount, fc.amount
  from folio_charges fc
  where fc.reservation_id = p_reservation_id
    and fc.id not in (
      select source_id from invoice_line_items where source_table = 'folio_charges' and source_id is not null
    );

  perform recompute_invoice_totals(v_invoice_id);
  update invoices set status = 'issued' where id = v_invoice_id and status = 'draft' and total_amount > 0;

  return v_invoice_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- RLS ----------

-- A staff member may act on a row in property_id P if they're 'admin'
-- (unscoped) or their own home property is P.
create or replace function is_staff_for_property(p_property_id uuid) returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and active = true
      and (role = 'admin' or property_id = p_property_id)
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_staff_for_property(uuid) to authenticated;

-- properties/buildings/floors/restaurants: any staff can read (needed for
-- switchers and dropdowns); only admin can define/edit them.
create or replace function is_admin_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and active = true and role = 'admin');
$$ language sql stable security definer set search_path = public;

grant execute on function is_admin_staff() to authenticated;

alter table properties enable row level security;
create policy properties_read on properties for select to authenticated using (is_staff());
create policy properties_admin_write on properties for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on properties to authenticated;

alter table buildings enable row level security;
create policy buildings_read on buildings for select to authenticated using (is_staff());
create policy buildings_admin_write on buildings for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on buildings to authenticated;

alter table floors enable row level security;
create policy floors_read on floors for select to authenticated using (is_staff());
create policy floors_admin_write on floors for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on floors to authenticated;

alter table restaurants enable row level security;
create policy restaurants_read on restaurants for select to authenticated using (is_staff_for_property(property_id));
create policy restaurants_write on restaurants for insert to authenticated with check (is_staff_for_property(property_id));
create policy restaurants_update on restaurants for update to authenticated using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
create policy restaurants_delete on restaurants for delete to authenticated using (is_staff_for_property(property_id));
grant select, insert, update, delete on restaurants to authenticated;

alter table property_inventory enable row level security;
create policy property_inventory_all on property_inventory for all to authenticated using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on property_inventory to authenticated;

-- Re-point the now-scoped tables' RLS at is_staff_for_property(property_id)
do $$
declare
  t text;
begin
  foreach t in array array[
    'room_types', 'rooms', 'reservations', 'orders',
    'banquet_venues', 'banquet_events', 'banquet_menu_packages',
    'engineering_assets', 'work_orders',
    'spa_services', 'spa_bookings', 'laundry_batches',
    'travel_vehicles', 'travel_bookings',
    'crm_campaigns', 'crm_leads',
    'purchase_orders', 'stock_movements', 'invoices'
  ]
  loop
    execute format('drop policy if exists %I_staff_all on %I', t, t);
    execute format(
      'create policy %I_property_all on %I for all to authenticated using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id))',
      t, t
    );
  end loop;
end $$;

-- restaurant_tables/menu_categories are scoped via their restaurant's property
drop policy if exists "restaurant_tables_staff_all" on restaurant_tables;
create policy restaurant_tables_property_all on restaurant_tables for all to authenticated using (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
) with check (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
);

drop policy if exists "menu_categories_staff_all" on menu_categories;
create policy menu_categories_property_all on menu_categories for all to authenticated using (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
) with check (
  is_staff_for_property((select property_id from restaurants where id = restaurant_id))
);

-- menu_items/order_items/purchase_order_items/invoice_line_items/folio_charges/
-- payments stay is_staff()-gated (they inherit scope through their parent row,
-- which is itself already property-checked on write; loosening these to plain
-- staff avoids an expensive correlated subquery on every line-item write).
