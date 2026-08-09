-- ============================================================
-- Corporate master-data templates: room types, menu categories,
-- and banquet packages defined once and adopted per property.
-- Adopting copies the template's values into a normal property-scoped
-- row (tagged with template_id for lineage); properties can then edit
-- their copy freely — an "override" is just that row diverging from the
-- template afterwards.
-- ============================================================

create table corporate_room_type_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_rate numeric(12,2) not null default 0,
  max_occupancy integer not null default 2,
  description text,
  amenities text,
  created_at timestamptz not null default now()
);

create table corporate_menu_category_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table corporate_banquet_package_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_per_cover numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table room_types add column template_id uuid references corporate_room_type_templates(id);
alter table menu_categories add column template_id uuid references corporate_menu_category_templates(id);
alter table banquet_menu_packages add column template_id uuid references corporate_banquet_package_templates(id);

create index idx_room_types_template on room_types(template_id);
create index idx_menu_categories_template on menu_categories(template_id);
create index idx_banquet_menu_packages_template on banquet_menu_packages(template_id);

alter table corporate_room_type_templates enable row level security;
create policy corporate_room_type_templates_read on corporate_room_type_templates for select to authenticated using (is_staff());
create policy corporate_room_type_templates_admin_write on corporate_room_type_templates for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on corporate_room_type_templates to authenticated;

alter table corporate_menu_category_templates enable row level security;
create policy corporate_menu_category_templates_read on corporate_menu_category_templates for select to authenticated using (is_staff());
create policy corporate_menu_category_templates_admin_write on corporate_menu_category_templates for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on corporate_menu_category_templates to authenticated;

alter table corporate_banquet_package_templates enable row level security;
create policy corporate_banquet_package_templates_read on corporate_banquet_package_templates for select to authenticated using (is_staff());
create policy corporate_banquet_package_templates_admin_write on corporate_banquet_package_templates for all to authenticated using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on corporate_banquet_package_templates to authenticated;
