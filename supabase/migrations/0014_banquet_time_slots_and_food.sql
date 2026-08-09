-- Setup/teardown buffer applied on both sides of a booking when checking
-- for venue conflicts (load-in/breakdown time, not guest-facing).
alter table banquet_venues add column buffer_minutes integer not null default 60;

-- Replace whole-day event_date with an actual time range so the same venue
-- can host multiple bookings on one date without conflict.
alter table banquet_events add column start_at timestamptz;
alter table banquet_events add column end_at timestamptz;
update banquet_events set start_at = event_date::timestamptz, end_at = event_date::timestamptz + interval '4 hours';
alter table banquet_events alter column start_at set not null;
alter table banquet_events alter column end_at set not null;
alter table banquet_events add constraint banquet_events_time_range check (end_at > start_at);
alter table banquet_events drop column event_date;

-- F&B package catalog (separate from the à la carte restaurant menu — banquet
-- pricing/dishes are typically per-cover packages, not individual items).
create table banquet_menu_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_per_cover numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Which package(s) an event has selected, and for how many covers (lets a
-- single event mix e.g. a veg package for 100 guests + non-veg for 220).
create table banquet_event_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references banquet_events(id) on delete cascade,
  package_id uuid not null references banquet_menu_packages(id),
  covers integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table banquet_menu_packages enable row level security;
create policy banquet_menu_packages_staff_all on banquet_menu_packages for all using (is_staff()) with check (is_staff());
grant select, insert, update, delete on banquet_menu_packages to anon, authenticated;

alter table banquet_event_items enable row level security;
create policy banquet_event_items_staff_all on banquet_event_items for all using (is_staff()) with check (is_staff());
grant select, insert, update, delete on banquet_event_items to anon, authenticated;

-- Conflict finder: any non-cancelled booking in the same venue whose
-- buffered window overlaps the requested [p_start_at, p_end_at).
create or replace function public.banquet_venue_conflicts(
  p_venue_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_event_id uuid default null
)
returns table (id uuid, event_name text, start_at timestamptz, end_at timestamptz)
language sql
stable
set search_path to 'public'
as $$
  select e.id, e.event_name, e.start_at, e.end_at
  from banquet_events e
  join banquet_venues v on v.id = e.venue_id
  where e.venue_id = p_venue_id
    and e.status <> 'cancelled'
    and (p_exclude_event_id is null or e.id <> p_exclude_event_id)
    and p_start_at < e.end_at + make_interval(mins => coalesce(v.buffer_minutes, 0))
    and p_end_at > e.start_at - make_interval(mins => coalesce(v.buffer_minutes, 0))
  order by e.start_at;
$$;

grant execute on function public.banquet_venue_conflicts(uuid, timestamptz, timestamptz, uuid) to anon, authenticated;

insert into banquet_menu_packages (name, description, price_per_cover) values
  ('Rajasthani Thali', 'Traditional Rajasthani thali with dal baati churma, gatte ki sabzi, and regional specialties', 1250),
  ('Continental Buffet', 'Soups, salads, mains and desserts buffet', 1800),
  ('Cocktail & Snacks', 'Passed hors d''oeuvres and a curated bar menu', 950),
  ('Wedding Grand Feast', 'Multi-cuisine live counters with dessert station', 2200);
