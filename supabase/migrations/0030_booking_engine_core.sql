-- ============================================================
-- Booking engine, part 1: multi-room/group bookings, corporate & travel-agent
-- accounts, booking source, guest preferences/special requests, and a
-- per-property cancellation/no-show/deposit policy.
--
-- `bookings` groups one or more `reservations` (one row per room-stay, kept
-- exactly as before — check-in/out, folio, and invoicing all still key off
-- reservations.id unchanged) under one guest/source/company/agent. It has
-- no property_id of its own, so — like guests — one booking can span rooms
-- at different properties. reservations.booking_id is nullable: existing
-- reservations, and any created without the new multi-room flow, keep
-- working exactly as before.
-- ============================================================

create type booking_source as enum ('direct', 'phone', 'walk_in', 'ota', 'travel_agent', 'corporate', 'other');

-- Shared across properties, same pattern as guests/suppliers.
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  billing_address text,
  contact_email text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table travel_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  default_commission_percent numeric(5,2) not null default 0 check (default_commission_percent >= 0 and default_commission_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default next_doc_number('BKG', 'booking_number_seq'),
  guest_id uuid not null references guests(id),
  source booking_source not null default 'direct',
  booking_type text not null default 'individual' check (booking_type in ('individual', 'group', 'corporate', 'travel_agent')),
  company_id uuid references companies(id) on delete set null,
  travel_agent_id uuid references travel_agents(id) on delete set null,
  commission_percent numeric(5,2) check (commission_percent >= 0 and commission_percent <= 100),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_bookings_guest on bookings(guest_id);
create index idx_bookings_company on bookings(company_id);
create index idx_bookings_travel_agent on bookings(travel_agent_id);

alter table reservations add column booking_id uuid references bookings(id) on delete set null;
alter table reservations add column special_requests text;
create index idx_reservations_booking on reservations(booking_id);

alter table guests add column preferences text;

-- Cancellation/no-show/deposit policy, configurable per property. Zero fees
-- and deposit_type 'none' matches exactly what cancelReservation already
-- did (nothing charged), so existing behavior is unaffected until an admin
-- sets a real policy.
alter table properties add column booking_policy jsonb not null default '{
  "cancellation_free_hours": 24,
  "cancellation_fee_percent": 0,
  "no_show_fee_percent": 0,
  "deposit_type": "none",
  "deposit_percent": 0,
  "deposit_amount": 0
}'::jsonb;

alter table folio_charges drop constraint folio_charges_charge_type_check;
alter table folio_charges add constraint folio_charges_charge_type_check
  check (charge_type in ('room', 'restaurant', 'service', 'misc', 'fee'));

alter table companies enable row level security;
create policy companies_all on companies for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on companies to authenticated;

alter table travel_agents enable row level security;
create policy travel_agents_all on travel_agents for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on travel_agents to authenticated;

alter table bookings enable row level security;
create policy bookings_all on bookings for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on bookings to authenticated;
