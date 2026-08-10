-- ============================================================
-- Inbound channel webhooks arrive with no staff session (there's no user
-- to authenticate as), so the usual is_staff_for_property() RLS policies
-- would block every write. These SECURITY DEFINER functions are the
-- webhook route's only way to touch reservations/bookings — each is
-- scoped to exactly one channel_connection_id, so a webhook can only ever
-- act on the property that connection belongs to, matching the pattern
-- already used for receive_stock_transfer / resolve_signup.
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
  v_source booking_source;
  v_channel_code text;
begin
  select cc.property_id, ch.code into v_property_id, v_channel_code
  from channel_connections cc join channels ch on ch.id = cc.channel_id
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

  v_source := case when v_channel_code in ('booking_com','expedia','agoda','makemytrip','goibibo','airbnb','google_hotel') then 'ota' else 'direct' end;

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
  values (v_guest_id, v_source, 'individual', p_connection_id, p_external_booking_id, 'Created from channel webhook')
  returning id into v_booking_id;

  insert into reservations (property_id, booking_id, guest_id, room_type_id, check_in_date, check_out_date, adults, children, rate_per_night)
  values (v_property_id, v_booking_id, v_guest_id, p_room_type_id, p_check_in, p_check_out, greatest(1, p_adults), greatest(0, p_children), p_rate)
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function webhook_create_reservation(uuid, text, text, text, text, uuid, date, date, int, int, numeric) to anon, authenticated;

create or replace function webhook_cancel_reservation(p_connection_id uuid, p_external_booking_id text)
returns void as $$
begin
  update reservations r
  set status = 'cancelled'
  from bookings b
  where b.id = r.booking_id
    and b.channel_connection_id = p_connection_id
    and b.external_booking_id = p_external_booking_id
    and r.status in ('confirmed', 'checked_in');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function webhook_cancel_reservation(uuid, text) to anon, authenticated;

create or replace function webhook_no_show_reservation(p_connection_id uuid, p_external_booking_id text)
returns void as $$
begin
  update reservations r
  set status = 'no_show'
  from bookings b
  where b.id = r.booking_id
    and b.channel_connection_id = p_connection_id
    and b.external_booking_id = p_external_booking_id
    and r.status = 'confirmed';
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function webhook_no_show_reservation(uuid, text) to anon, authenticated;

-- Modification: only dates/occupancy move (a rate/room-type change from a
-- channel is rare and riskier to auto-apply, so this intentionally
-- doesn't touch rate_per_night or room_type_id).
create or replace function webhook_modify_reservation(
  p_connection_id uuid,
  p_external_booking_id text,
  p_check_in date,
  p_check_out date,
  p_adults int,
  p_children int
) returns void as $$
declare
  v_reservation_id uuid;
  v_room_type_id uuid;
begin
  select r.id, r.room_type_id into v_reservation_id, v_room_type_id
  from reservations r join bookings b on b.id = r.booking_id
  where b.channel_connection_id = p_connection_id and b.external_booking_id = p_external_booking_id
    and r.status in ('confirmed', 'checked_in')
  limit 1;

  if v_reservation_id is null then
    raise exception 'No matching reservation for this booking';
  end if;

  if not check_availability(v_room_type_id, p_check_in, p_check_out, v_reservation_id) then
    raise exception 'No availability for the modified dates';
  end if;

  update reservations
  set check_in_date = p_check_in, check_out_date = p_check_out, adults = greatest(1, p_adults), children = greatest(0, p_children)
  where id = v_reservation_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function webhook_modify_reservation(uuid, text, date, date, int, int) to anon, authenticated;
