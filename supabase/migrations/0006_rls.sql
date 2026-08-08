-- ============================================================
-- Hotel & Restaurant MS — Row Level Security
-- Internal staff tool: any authenticated user with an active
-- profile row may read/write. Tighten per-role later if needed.
-- ============================================================

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and active = true);
$$ language sql stable security definer set search_path = public;

alter table profiles enable row level security;
create policy "profiles_staff_all" on profiles for all to authenticated using (is_staff()) with check (is_staff());
create policy "profiles_self_read" on profiles for select to authenticated using (id = auth.uid());
create policy "profiles_self_insert" on profiles for insert to authenticated with check (id = auth.uid());

alter table room_types enable row level security;
create policy "room_types_staff_all" on room_types for all to authenticated using (is_staff()) with check (is_staff());

alter table rooms enable row level security;
create policy "rooms_staff_all" on rooms for all to authenticated using (is_staff()) with check (is_staff());

alter table guests enable row level security;
create policy "guests_staff_all" on guests for all to authenticated using (is_staff()) with check (is_staff());

alter table reservations enable row level security;
create policy "reservations_staff_all" on reservations for all to authenticated using (is_staff()) with check (is_staff());

alter table folio_charges enable row level security;
create policy "folio_charges_staff_all" on folio_charges for all to authenticated using (is_staff()) with check (is_staff());

alter table restaurant_tables enable row level security;
create policy "restaurant_tables_staff_all" on restaurant_tables for all to authenticated using (is_staff()) with check (is_staff());

alter table menu_categories enable row level security;
create policy "menu_categories_staff_all" on menu_categories for all to authenticated using (is_staff()) with check (is_staff());

alter table menu_items enable row level security;
create policy "menu_items_staff_all" on menu_items for all to authenticated using (is_staff()) with check (is_staff());

alter table orders enable row level security;
create policy "orders_staff_all" on orders for all to authenticated using (is_staff()) with check (is_staff());

alter table order_items enable row level security;
create policy "order_items_staff_all" on order_items for all to authenticated using (is_staff()) with check (is_staff());

alter table inventory_categories enable row level security;
create policy "inventory_categories_staff_all" on inventory_categories for all to authenticated using (is_staff()) with check (is_staff());

alter table inventory_items enable row level security;
create policy "inventory_items_staff_all" on inventory_items for all to authenticated using (is_staff()) with check (is_staff());

alter table suppliers enable row level security;
create policy "suppliers_staff_all" on suppliers for all to authenticated using (is_staff()) with check (is_staff());

alter table purchase_orders enable row level security;
create policy "purchase_orders_staff_all" on purchase_orders for all to authenticated using (is_staff()) with check (is_staff());

alter table purchase_order_items enable row level security;
create policy "purchase_order_items_staff_all" on purchase_order_items for all to authenticated using (is_staff()) with check (is_staff());

alter table stock_movements enable row level security;
create policy "stock_movements_staff_all" on stock_movements for all to authenticated using (is_staff()) with check (is_staff());

alter table invoices enable row level security;
create policy "invoices_staff_all" on invoices for all to authenticated using (is_staff()) with check (is_staff());

alter table invoice_line_items enable row level security;
create policy "invoice_line_items_staff_all" on invoice_line_items for all to authenticated using (is_staff()) with check (is_staff());

alter table payments enable row level security;
create policy "payments_staff_all" on payments for all to authenticated using (is_staff()) with check (is_staff());
