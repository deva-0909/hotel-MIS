-- ============================================================
-- webhook_create_reservation only ever fires for a booking that arrived
-- through a channel webhook — by definition that's never "direct" (walk-in/
-- phone/website), regardless of which channel it came from. The original
-- version hardcoded a channel-code allowlist that silently mislabeled any
-- channel not on it (including ical_generic) as 'direct'.
-- ============================================================

create or replace function webhook_create_reservation(
  p_connection_id uuid,
  p_external_booking_id text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults int,
  p_children int,
  p_rate numeric
) returns uuid as $$
declare
  v_property_id uuid;
  v_guest_id uuid;
  v_booking_id uuid;
  v_reservation_id uuid;
begin
  select cc.property_id into v_property_id
  from channel_connections cc
  where cc.id = p_connection_id;

  if v_property_id is null then
    raise exception 'Unknown channel connection';
  end if;

  if p_room_type_id is null or not exists (select 1 from room_types where id = p_room_type_id and property_id = v_property_id) then
    raise exception 'Room type not recognized for this property';
  end if;

  if not check_availability(p_room_type_id, p_check_in, p_check_out) then
    raise exception 'No availability for the requested dates';
  end if;

  if p_guest_phone is not null then
    select id into v_guest_id from guests where phone = p_guest_phone limit 1;
  end if;
  if v_guest_id is null and p_guest_email is not null then
    select id into v_guest_id from guests where email = p_guest_email limit 1;
  end if;
  if v_guest_id is null then
    insert into guests (full_name, email, phone) values (p_guest_name, p_guest_email, p_guest_phone) returning id into v_guest_id;
  end if;

  insert into bookings (guest_id, source, booking_type, channel_connection_id, external_booking_id, notes)
  values (v_guest_id, 'ota', 'individual', p_connection_id, p_external_booking_id, 'Created from channel webhook')
  returning id into v_booking_id;

  insert into reservations (property_id, booking_id, guest_id, room_type_id, check_in_date, check_out_date, adults, children, rate_per_night)
  values (v_property_id, v_booking_id, v_guest_id, p_room_type_id, p_check_in, p_check_out, greatest(1, p_adults), greatest(0, p_children), p_rate)
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$ language plpgsql security definer set search_path = public;
