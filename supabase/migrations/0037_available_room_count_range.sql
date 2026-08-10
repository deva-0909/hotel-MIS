-- ============================================================
-- A channel push needs a whole sync window (e.g. the next 60 days) of
-- per-day counts — calling available_room_count() once per day would mean
-- dozens of round trips per room type. This returns the whole range in one
-- call instead.
-- ============================================================

create or replace function available_room_counts_for_range(p_room_type_id uuid, p_start_date date, p_end_date date)
returns table(stay_date date, available_count int) as $$
declare
  v_total_rooms int;
begin
  select count(*) into v_total_rooms from rooms where room_type_id = p_room_type_id;

  return query
  select day::date as stay_date,
    greatest(0, v_total_rooms - coalesce((
      select count(*) from reservations r
      where r.room_type_id = p_room_type_id
        and r.status in ('confirmed', 'checked_in')
        and r.check_in_date <= day::date and r.check_out_date > day::date
    ), 0))::int as available_count
  from generate_series(p_start_date, p_end_date, interval '1 day') as day;
end;
$$ language plpgsql stable set search_path = public;

grant execute on function available_room_counts_for_range(uuid, date, date) to authenticated;
