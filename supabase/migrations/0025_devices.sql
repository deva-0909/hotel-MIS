-- ============================================================
-- Printer/KDS device registry: physical (or virtual) devices at a
-- property, mapped to whichever restaurant/service area or kitchen they
-- serve. A KDS device maps to a kitchen (the same kitchens tickets already
-- route to, see 0017_kitchens_and_transfers.sql); a printer maps to a
-- restaurant and, optionally, a specific service area within it.
-- ============================================================

create type device_type as enum ('printer', 'kds');

create table devices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  device_type device_type not null,
  name text not null,
  identifier text,
  restaurant_id uuid references restaurants(id) on delete set null,
  kitchen_id uuid references kitchens(id) on delete set null,
  service_area_id uuid references service_areas(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_devices_property on devices(property_id);
create index idx_devices_restaurant on devices(restaurant_id);
create index idx_devices_kitchen on devices(kitchen_id);

alter table devices enable row level security;
create policy devices_all on devices for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on devices to authenticated;
