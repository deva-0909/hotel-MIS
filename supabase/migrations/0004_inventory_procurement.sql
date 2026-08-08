-- ============================================================
-- Hotel & Restaurant MS — Inventory & procurement
-- Stock items, stock ledger, suppliers, purchase orders
-- ============================================================

create type po_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
create type stock_movement_type as enum ('purchase_receipt', 'consumption', 'adjustment', 'wastage');

create table inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references inventory_categories(id),
  name text not null,
  unit text not null default 'pcs',
  current_stock numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inventory_items_category on inventory_items(category_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique default next_doc_number('PO', 'po_number_seq'),
  supplier_id uuid not null references suppliers(id),
  status po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_purchase_orders_supplier on purchase_orders(supplier_id);
create index idx_purchase_orders_status on purchase_orders(status);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  received_quantity numeric(14,3) not null default 0
);

create index idx_po_items_po on purchase_order_items(po_id);

-- Append-only ledger of every stock change; current_stock on inventory_items is
-- kept in sync by trigger below so screens can read a running balance directly.
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id),
  movement_type stock_movement_type not null,
  quantity numeric(14,3) not null,
  reference_table text,
  reference_id uuid,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_stock_movements_item on stock_movements(inventory_item_id);

create trigger trg_inventory_items_updated before update on inventory_items
  for each row execute function set_updated_at();
create trigger trg_purchase_orders_updated before update on purchase_orders
  for each row execute function set_updated_at();

-- purchase_receipt / adjustment(+) add stock; consumption / wastage / adjustment(-) subtract it.
-- Callers record the signed quantity directly for adjustments, and a positive
-- quantity for purchase_receipt/consumption/wastage (direction implied by type).
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

  update inventory_items set current_stock = current_stock + delta where id = new.inventory_item_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_stock_movements_apply after insert on stock_movements
  for each row execute function apply_stock_movement();

-- Receiving a PO line posts a purchase_receipt stock movement and updates received_quantity
create or replace function receive_po_item(p_po_item_id uuid, p_quantity numeric, p_staff_id uuid)
returns void as $$
declare
  v_item_id uuid;
  v_po_id uuid;
begin
  select inventory_item_id, po_id into v_item_id, v_po_id
  from purchase_order_items where id = p_po_item_id;

  update purchase_order_items set received_quantity = received_quantity + p_quantity
  where id = p_po_item_id;

  insert into stock_movements (inventory_item_id, movement_type, quantity, reference_table, reference_id, created_by)
  values (v_item_id, 'purchase_receipt', p_quantity, 'purchase_orders', v_po_id, p_staff_id);

  update purchase_orders po set status = case
    when (select bool_and(received_quantity >= quantity) from purchase_order_items where po_id = po.id) then 'received'::po_status
    else 'partially_received'::po_status
  end
  where po.id = v_po_id;
end;
$$ language plpgsql security definer set search_path = public;
