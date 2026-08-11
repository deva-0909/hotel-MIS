-- ============================================================
-- Restaurant Master, part 2: meal periods, item-level corporate templates,
-- variants, modifiers/add-ons, combos, upsell suggestions.
-- ============================================================

-- Meal periods (breakfast/lunch/dinner) — restaurant-scoped since two
-- restaurants at the same property can keep different hours. Days stored
-- as day-name text[] to match the existing working_hours convention
-- (DAYS in src/lib/working-hours.ts) rather than inventing a 0-6 scheme.
create table meal_periods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  days_of_week text[] not null default array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_meal_periods_restaurant on meal_periods(restaurant_id);

alter table meal_periods enable row level security;
create policy meal_periods_all on meal_periods for all to authenticated
  using (is_staff_for_property((select property_id from restaurants where id = restaurant_id)))
  with check (is_staff_for_property((select property_id from restaurants where id = restaurant_id)));
grant select, insert, update, delete on meal_periods to authenticated;

-- Null meal_period_id means "always available" (existing behavior,
-- unchanged) — a period only restricts an item once explicitly assigned.
alter table menu_items add column meal_period_id uuid references meal_periods(id) on delete set null;

-- Item-level corporate template, extending the existing pattern
-- (corporate_room_type_templates / corporate_menu_category_templates /
-- corporate_banquet_package_templates all already work this way: HQ
-- defines once, a property "adopts" a copy it can then edit freely).
create table corporate_menu_item_templates (
  id uuid primary key default gen_random_uuid(),
  category_template_id uuid references corporate_menu_category_templates(id) on delete set null,
  name text not null,
  price numeric(12,2) not null default 0,
  is_veg boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

alter table corporate_menu_item_templates enable row level security;
create policy corporate_menu_item_templates_read on corporate_menu_item_templates for select to authenticated using (is_staff());
create policy corporate_menu_item_templates_admin_write on corporate_menu_item_templates for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on corporate_menu_item_templates to authenticated;

alter table menu_items add column template_id uuid references corporate_menu_item_templates(id);
create index idx_menu_items_template on menu_items(template_id);

-- Variants (including size): a price_delta on top of whichever channel
-- price applies, not a whole separate price sheet — "Large +60" rather
-- than duplicating four price columns per size.
create table menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_menu_item_variants_item on menu_item_variants(menu_item_id);

alter table menu_item_variants enable row level security;
create policy menu_item_variants_all on menu_item_variants for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on menu_item_variants to authenticated;

-- Modifiers and add-ons are the same mechanism: a modifier with
-- price_delta = 0 is a free customization ("no onions"), one with
-- price_delta > 0 is what's usually called an add-on ("add cheese +50").
-- A group applies to exactly one menu item OR every item in a category,
-- never both.
create table menu_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete cascade,
  name text not null,
  selection_type text not null default 'single' check (selection_type in ('single', 'multiple')),
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check ((menu_item_id is not null and category_id is null) or (menu_item_id is null and category_id is not null))
);

create index idx_menu_modifier_groups_item on menu_modifier_groups(menu_item_id);
create index idx_menu_modifier_groups_category on menu_modifier_groups(category_id);

alter table menu_modifier_groups enable row level security;
create policy menu_modifier_groups_all on menu_modifier_groups for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on menu_modifier_groups to authenticated;

create table menu_modifiers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references menu_modifier_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_menu_modifiers_group on menu_modifiers(group_id);

alter table menu_modifiers enable row level security;
create policy menu_modifiers_all on menu_modifiers for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on menu_modifiers to authenticated;

-- Combos: a fixed bundle at a flat price. menu_combo_items is what's
-- included (display/reference only — the combo's own price is what's
-- charged, not a sum of its parts).
create table menu_combos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  is_available boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create index idx_menu_combos_restaurant on menu_combos(restaurant_id);

alter table menu_combos enable row level security;
create policy menu_combos_all on menu_combos for all to authenticated
  using (is_staff_for_property((select property_id from restaurants where id = restaurant_id)))
  with check (is_staff_for_property((select property_id from restaurants where id = restaurant_id)));
grant select, insert, update, delete on menu_combos to authenticated;

create table menu_combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references menu_combos(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0)
);

create index idx_menu_combo_items_combo on menu_combo_items(combo_id);

alter table menu_combo_items enable row level security;
create policy menu_combo_items_all on menu_combo_items for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on menu_combo_items to authenticated;

-- Upsell suggestions: "guests who order X are often offered Y."
create table menu_item_upsells (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  suggested_item_id uuid not null references menu_items(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (menu_item_id, suggested_item_id),
  check (menu_item_id <> suggested_item_id)
);

create index idx_menu_item_upsells_item on menu_item_upsells(menu_item_id);

alter table menu_item_upsells enable row level security;
create policy menu_item_upsells_all on menu_item_upsells for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on menu_item_upsells to authenticated;

-- order_items: allow a combo line (no single menu_item_id) and record
-- which variant was picked. The financial truth still lives entirely in
-- unit_price (channel price + variant delta + modifier deltas, folded in
-- at order time) — billOrder()/invoice generation need no changes.
-- order_item_modifiers is a display/kitchen-ticket record of what was
-- actually selected, snapshotting the name/price at order time so a later
-- edit to the modifier definition can't rewrite history.
alter table order_items alter column menu_item_id drop not null;
alter table order_items add column variant_id uuid references menu_item_variants(id) on delete set null;
alter table order_items add column combo_id uuid references menu_combos(id) on delete set null;
alter table order_items add constraint order_items_item_or_combo
  check ((menu_item_id is not null and combo_id is null) or (menu_item_id is null and combo_id is not null));

create table order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  modifier_id uuid references menu_modifiers(id) on delete set null,
  modifier_name text not null,
  price_delta numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_order_item_modifiers_order_item on order_item_modifiers(order_item_id);

alter table order_item_modifiers enable row level security;
create policy order_item_modifiers_all on order_item_modifiers for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on order_item_modifiers to authenticated;
