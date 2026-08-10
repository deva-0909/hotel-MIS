-- ============================================================
-- The public iCal export feed (GET /api/channels/ical/[token]) has no
-- staff session either — it's fetched by Airbnb/Booking.com's own
-- servers, not a logged-in user. This looks up the connection by its
-- export token (the feed's only "auth") and returns busy ranges for one
-- room type, scoped to that connection's own property.
-- ============================================================

create or replace function get_busy_ranges_for_ical(p_token uuid, p_room_type_id uuid)
returns table(start_date date, end_date date) as $$
declare
  v_property_id uuid;
begin
  select property_id into v_property_id from channel_connections where ical_export_token = p_token;
  if v_property_id is null then
    raise exception 'Invalid feed token';
  end if;
  if not exists (select 1 from room_types where id = p_room_type_id and property_id = v_property_id) then
    raise exception 'Room type not recognized for this property';
  end if;

  return query
  select r.check_in_date, r.check_out_date
  from reservations r
  where r.room_type_id = p_room_type_id
    and r.status in ('confirmed', 'checked_in')
  union all
  select ar.start_date, ar.end_date + 1
  from availability_restrictions ar
  where ar.room_type_id = p_room_type_id and ar.stop_sell;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function get_busy_ranges_for_ical(uuid, uuid) to anon, authenticated;
