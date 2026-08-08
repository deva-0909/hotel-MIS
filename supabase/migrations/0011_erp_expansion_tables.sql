-- Org context for the corporate/region/property breadcrumb hierarchy
create table hotel_settings (
  id uuid primary key default gen_random_uuid(),
  corporate_name text not null default 'Corporate Office',
  region_name text not null default 'Region',
  hotel_name text not null default 'Hotel',
  city text,
  gstin text,
  updated_at timestamptz not null default now()
);

-- HR: roster, attendance, leave
create table hr_employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique default next_doc_number('EMP', 'hr_employee_seq'),
  full_name text not null,
  department text not null,
  role_title text,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','on_leave','inactive')),
  created_at timestamptz not null default now()
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present','absent','leave','week_off')),
  created_at timestamptz not null default now(),
  unique (employee_id, attendance_date)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('sick','casual','earned')),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- Housekeeping task queue
create table housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  status text not null default 'dirty' check (status in ('dirty','inspecting','clean')),
  attendant text,
  priority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Engineering & Maintenance
create table engineering_assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique default next_doc_number('AST', 'asset_code_seq'),
  name text not null,
  category text not null,
  location text,
  status text not null default 'operational' check (status in ('operational','under_maintenance','needs_attention')),
  next_service_date date,
  created_at timestamptz not null default now()
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  wo_number text not null unique default next_doc_number('WO', 'work_order_seq'),
  asset_id uuid references engineering_assets(id) on delete set null,
  location text not null,
  issue text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','assigned','in_progress','scheduled','resolved')),
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CRM & Marketing
create table crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  audience text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','live','ended')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table crm_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text,
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','lost')),
  created_at timestamptz not null default now()
);

alter table guests add column loyalty_tier text;
alter table guests add column loyalty_points integer not null default 0;

-- Banquet & Events
create table banquet_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null default 0
);

create table banquet_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  client_name text not null,
  venue_id uuid references banquet_venues(id) on delete set null,
  covers integer not null default 0,
  event_date date not null,
  status text not null default 'tentative' check (status in ('tentative','confirmed','completed','cancelled')),
  value_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Spa & Laundry
create table spa_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null default 60,
  price numeric(10,2) not null default 0
);

create table spa_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  walk_in_name text,
  service_id uuid not null references spa_services(id),
  therapist text,
  scheduled_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table laundry_batches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete set null,
  guest_id uuid references guests(id) on delete set null,
  item_count integer not null default 0,
  status text not null default 'collected' check (status in ('collected','in_process','ready','delivered')),
  created_at timestamptz not null default now()
);

-- Travel Desk
create table travel_vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle_type text not null,
  status text not null default 'available' check (status in ('available','in_use','maintenance'))
);

create table travel_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  walk_in_name text,
  service_type text not null,
  vendor text,
  vehicle_id uuid references travel_vehicles(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'inquiry' check (status in ('inquiry','scheduled','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

-- Menu: per-channel pricing
alter table menu_items add column parcel_price numeric(10,2);
alter table menu_items add column own_delivery_price numeric(10,2);
alter table menu_items add column aggregator_price numeric(10,2);
