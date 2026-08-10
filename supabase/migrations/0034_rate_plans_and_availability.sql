-- ============================================================
-- Rate plans + a real per-date availability/restriction engine.
--
-- Room status (available/reserved/occupied) is a coarse current-moment
-- flag — it can't tell you whether Room 101 is free on a date three
-- months out, so unassigned-room bookings (room_id left null, the common
-- case) had *no* capacity check at all: nothing stopped selling the same
-- room type past its physical room count. check_availability() below is
-- the real fix — it counts actual overlapping reservations per date
-- against the room type's physical room count, and honors min/max-stay,
-- stop-sell, and closed-to-arrival/departure restrictions. This is also
-- the foundation a channel manager needs: it's the same math an OTA push
-- would report as "how many rooms do you have on this date."
-- ============================================================

create table rate_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete cascade,
  name text not null,
  base_rate numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (room_type_id, name)
);

create index idx_rate_plans_property on rate_plans(property_id);
create index idx_rate_plans_room_type on rate_plans(room_type_id);

alter table rate_plans enable row level security;
create policy rate_plans_all on rate_plans for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on rate_plans to authenticated;

-- Reservations can optionally sell against a specific rate plan (its rate
-- pre-fills rate_per_night) rather than just the room type's flat
-- base_rate — nullable, so every existing reservation is unaffected.
alter table reservations add column rate_plan_id uuid references rate_plans(id) on delete set null;

-- Sparse: a row only exists where a restriction is actually set for a date
-- range, not one row per room-type per day forever.
create table availability_restrictions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  min_stay int,
  max_stay int,
  closed_to_arrival boolean not null default false,
  closed_to_departure boolean not null default false,
  stop_sell boolean not null default false,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_availability_restrictions_room_type on availability_restrictions(room_type_id, start_date, end_date);

alter table availability_restrictions enable row level security;
create policy availability_restrictions_all on availability_restrictions for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on availability_restrictions to authenticated;

create trigger trg_audit_rate_plans after insert or update or delete on rate_plans
  for each row execute function log_config_change();
create trigger trg_audit_availability_restrictions after insert or update or delete on availability_restrictions
  for each row execute function log_config_change();

-- Real per-date capacity + restriction check for a room type over
-- [p_check_in, p_check_out). p_exclude_reservation_id lets a reservation
-- being modified check against everyone *else's* bookings instead of
-- colliding with itself.
create or replace function check_availability(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_exclude_reservation_id uuid default null
) returns boolean as $$
declare
  v_total_rooms int;
  v_max_overlap int;
  v_nights int;
  v_violates boolean;
begin
  select count(*) into v_total_rooms from rooms where room_type_id = p_room_type_id;
  if v_total_rooms = 0 then
    return false;
  end if;

  -- Worst-case concurrent demand: the highest number of overlapping
  -- confirmed/checked-in reservations on any single night in the range.
  select coalesce(max(demand), 0) into v_max_overlap
  from (
    select count(*) as demand
    from reservations r, generate_series(p_check_in, p_check_out - 1, interval '1 day') as night
    where r.room_type_id = p_room_type_id
      and r.status in ('confirmed', 'checked_in')
      and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
      and r.check_in_date <= night::date and r.check_out_date > night::date
    group by night
  ) demand_by_night;

  if v_total_rooms - v_max_overlap < 1 then
    return false;
  end if;

  v_nights := p_check_out - p_check_in;

  select exists (
    select 1 from availability_restrictions ar
    where ar.room_type_id = p_room_type_id
      and ar.start_date <= p_check_out - 1 and ar.end_date >= p_check_in
      and (
        ar.stop_sell
        or (ar.min_stay is not null and v_nights < ar.min_stay)
        or (ar.max_stay is not null and v_nights > ar.max_stay)
        or (ar.closed_to_arrival and ar.start_date <= p_check_in and ar.end_date >= p_check_in)
        or (ar.closed_to_departure and ar.start_date <= p_check_out and ar.end_date >= p_check_out)
      )
  ) into v_violates;

  return not v_violates;
end;
$$ language plpgsql stable set search_path = public;

grant execute on function check_availability(uuid, date, date, uuid) to authenticated;
