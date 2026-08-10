-- ============================================================
-- check_availability() answers "can I book these dates" (a boolean over a
-- range). Pushing to a channel needs an actual per-day count instead — how
-- many rooms of this type are free on this one date — so the channel can
-- be told "3 available" rather than just yes/no.
-- ============================================================

create or replace function available_room_count(p_room_type_id uuid, p_date date)
returns int as $$
declare
  v_total_rooms int;
  v_booked int;
begin
  select count(*) into v_total_rooms from rooms where room_type_id = p_room_type_id;

  select count(*) into v_booked
  from reservations
  where room_type_id = p_room_type_id
    and status in ('confirmed', 'checked_in')
    and check_in_date <= p_date and check_out_date > p_date;

  return greatest(0, v_total_rooms - v_booked);
end;
$$ language plpgsql stable set search_path = public;

grant execute on function available_room_count(uuid, date) to authenticated;
