-- ============================================================
-- Hotel & Restaurant MS — Restaurant / POS
-- Tables, menu, orders, kitchen order tickets (KOT)
-- ============================================================

create type table_status as enum ('available', 'occupied', 'reserved', 'cleaning');
create type order_type as enum ('dine_in', 'room_service', 'takeaway');
create type order_status as enum ('open', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'billed', 'cancelled');
create type order_item_status as enum ('pending', 'preparing', 'ready', 'served', 'cancelled');

create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique,
  capacity int not null default 2,
  status table_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id),
  name text not null,
  price numeric(12,2) not null default 0,
  is_veg boolean not null default true,
  is_available boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create index idx_menu_items_category on menu_items(category_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default next_doc_number('ORD', 'order_number_seq'),
  order_type order_type not null default 'dine_in',
  table_id uuid references restaurant_tables(id),
  reservation_id uuid references reservations(id),
  guest_id uuid references guests(id),
  bill_to_room boolean not null default false,
  status order_status not null default 'open',
  waiter_id uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bill_to_room = false or reservation_id is not null)
);

create index idx_orders_table on orders(table_id);
create index idx_orders_status on orders(status);
create index idx_orders_reservation on orders(reservation_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null,
  status order_item_status not null default 'pending',
  notes text,
  kot_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_order_items_order on order_items(order_id);

create trigger trg_restaurant_tables_updated before update on restaurant_tables
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- Keep table status in sync with order lifecycle (dine-in only)
create or replace function sync_table_status_on_order() returns trigger as $$
begin
  if new.table_id is not null then
    if new.status in ('open', 'sent_to_kitchen', 'preparing', 'ready', 'served') then
      update restaurant_tables set status = 'occupied' where id = new.table_id;
    elsif new.status in ('billed', 'cancelled') then
      update restaurant_tables set status = 'cleaning' where id = new.table_id and status = 'occupied';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_table_status after insert or update of status on orders
  for each row execute function sync_table_status_on_order();

-- When a room-service order is billed to the room, post it straight to the guest's folio
create or replace function post_restaurant_charge_on_bill() returns trigger as $$
declare
  order_total numeric(12,2);
begin
  if new.status = 'billed' and (old.status is distinct from 'billed') and new.bill_to_room and new.reservation_id is not null then
    select coalesce(sum(quantity * unit_price), 0) into order_total
    from order_items where order_id = new.id and status <> 'cancelled';

    insert into folio_charges (reservation_id, charge_type, description, amount, source_table, source_id)
    values (new.reservation_id, 'restaurant', format('Restaurant order %s', new.order_number), order_total, 'orders', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_post_folio_charge after update of status on orders
  for each row execute function post_restaurant_charge_on_bill();
