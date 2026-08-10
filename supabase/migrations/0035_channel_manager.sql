-- ============================================================
-- Channel manager: per-property connections to OTAs/distribution channels,
-- rate-plan mapping, and a sync log for push/pull attempts (availability,
-- rates, restrictions, reservations, cancellations, modifications,
-- no-shows) — the log is also the reconciliation trail and retry queue.
-- ============================================================

create table channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in (
    'booking_com', 'expedia', 'agoda', 'makemytrip', 'goibibo', 'airbnb', 'google_hotel', 'ical_generic'
  )),
  name text not null,
  supports_ical boolean not null default false,
  supports_api boolean not null default false
);

insert into channels (code, name, supports_ical, supports_api) values
  ('booking_com', 'Booking.com', true, true),
  ('expedia', 'Expedia', false, true),
  ('agoda', 'Agoda', false, true),
  ('makemytrip', 'MakeMyTrip', false, true),
  ('goibibo', 'Goibibo', false, true),
  ('airbnb', 'Airbnb', true, true),
  ('google_hotel', 'Google Hotel Ads', false, true),
  ('ical_generic', 'Generic iCal feed', true, false);

alter table channels enable row level security;
create policy channels_read on channels for select to authenticated using (is_staff());
grant select on channels to authenticated;

-- Holds credentials, so admin-only end to end (not the usual
-- is_staff_for_property pattern every other property-scoped table uses).
create table channel_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  channel_id uuid not null references channels(id),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  external_property_id text,
  api_key text,
  api_secret text,
  ical_export_token uuid not null default gen_random_uuid(),
  ical_import_url text,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, channel_id)
);

create index idx_channel_connections_property on channel_connections(property_id);

alter table channel_connections enable row level security;
create policy channel_connections_admin_all on channel_connections for all to authenticated
  using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on channel_connections to authenticated;

create trigger trg_channel_connections_updated before update on channel_connections
  for each row execute function set_updated_at();
create trigger trg_audit_channel_connections after insert or update or delete on channel_connections
  for each row execute function log_config_change();

-- Maps an internal rate plan to whatever ID that same product has on the
-- OTA's side, so a push knows which of the OTA's rate plans to update.
create table channel_rate_plan_map (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid not null references channel_connections(id) on delete cascade,
  rate_plan_id uuid not null references rate_plans(id) on delete cascade,
  external_rate_plan_id text not null,
  external_room_type_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (channel_connection_id, rate_plan_id)
);

alter table channel_rate_plan_map enable row level security;
create policy channel_rate_plan_map_admin_all on channel_rate_plan_map for all to authenticated using (
  is_admin_staff()
) with check (
  is_admin_staff()
);
grant select, insert, update, delete on channel_rate_plan_map to authenticated;

create table channel_sync_log (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid not null references channel_connections(id) on delete cascade,
  direction text not null check (direction in ('push', 'pull')),
  sync_type text not null check (sync_type in (
    'availability', 'rates', 'restrictions', 'reservation', 'cancellation', 'modification', 'no_show', 'reconciliation'
  )),
  status text not null check (status in ('success', 'failed', 'retrying')),
  payload_summary text,
  error_message text,
  retry_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_channel_sync_log_connection on channel_sync_log(channel_connection_id, created_at desc);
create index idx_channel_sync_log_status on channel_sync_log(status) where status <> 'success';

alter table channel_sync_log enable row level security;
create policy channel_sync_log_admin_read on channel_sync_log for select to authenticated using (
  is_admin_staff()
);
grant select, insert, update on channel_sync_log to authenticated;

-- A booking that originated on a channel (inbound webhook) instead of
-- being entered by staff — external_booking_id is that channel's own
-- reservation ID, used to de-duplicate and reconcile.
alter table bookings add column channel_connection_id uuid references channel_connections(id) on delete set null;
alter table bookings add column external_booking_id text;
create unique index idx_bookings_external on bookings(channel_connection_id, external_booking_id) where external_booking_id is not null;
