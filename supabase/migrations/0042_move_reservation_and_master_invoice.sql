-- ============================================================
-- move_reservation(): the single RPC behind both "drag a reservation to a
-- different room/date on the room rack" and the plain change-room/move-
-- dates form on the reservation page — same validation either way (target
-- room free, room-type capacity/restrictions honored via the existing
-- check_availability()). A room-type change is exactly what an
-- upgrade/downgrade is: this doesn't special-case it, it just carries the
-- new room's type and rate through.
--
-- generate_master_invoice_from_booking(): a single consolidated invoice
-- across every reservation in a group booking, mirroring
-- generate_invoice_from_reservation()'s "insert only unbilled folio
-- charges" logic but scoped to a whole booking instead of one reservation.
-- ============================================================

create or replace function move_reservation(
  p_reservation_id uuid,
  p_new_room_id uuid,
  p_new_check_in date,
  p_new_check_out date,
  p_new_rate_per_night numeric default null
) returns void as $$
declare
  v_property_id uuid;
  v_status reservation_status;
  v_room_property_id uuid;
  v_room_type_id uuid;
  v_conflict_count int;
begin
  select property_id, status into v_property_id, v_status from reservations where id = p_reservation_id;
  if v_property_id is null then
    raise exception 'Reservation not found';
  end if;
  if v_status not in ('confirmed', 'checked_in') then
    raise exception 'Only a confirmed or checked-in reservation can be moved';
  end if;
  if p_new_check_out <= p_new_check_in then
    raise exception 'Check-out must be after check-in';
  end if;

  select property_id, room_type_id into v_room_property_id, v_room_type_id from rooms where id = p_new_room_id;
  if v_room_property_id is null then
    raise exception 'Target room not found';
  end if;
  if v_room_property_id <> v_property_id then
    raise exception 'Cannot move to a room at a different property this way — use the property transfer action instead';
  end if;

  select count(*) into v_conflict_count
  from reservations
  where room_id = p_new_room_id
    and id <> p_reservation_id
    and status in ('confirmed', 'checked_in')
    and check_in_date < p_new_check_out and check_out_date > p_new_check_in;
  if v_conflict_count > 0 then
    raise exception 'Target room is already booked for an overlapping date';
  end if;

  if not check_availability(v_room_type_id, p_new_check_in, p_new_check_out, p_reservation_id) then
    raise exception 'No availability for this room type on the new dates';
  end if;

  update reservations
  set room_id = p_new_room_id,
      room_type_id = v_room_type_id,
      check_in_date = p_new_check_in,
      check_out_date = p_new_check_out,
      rate_per_night = coalesce(p_new_rate_per_night, rate_per_night)
  where id = p_reservation_id;
end;
$$ language plpgsql set search_path = public;

grant execute on function move_reservation(uuid, uuid, date, date, numeric) to authenticated;

create or replace function generate_master_invoice_from_booking(p_booking_id uuid, p_staff_id uuid)
returns uuid as $$
declare
  v_guest_id uuid;
  v_booking_type text;
  v_company_id uuid;
  v_travel_agent_id uuid;
  v_property_id uuid;
  v_bill_to text;
  v_invoice_id uuid;
  v_property_count int;
begin
  select guest_id, booking_type, company_id, travel_agent_id into v_guest_id, v_booking_type, v_company_id, v_travel_agent_id
  from bookings where id = p_booking_id;

  if v_guest_id is null then
    raise exception 'Booking not found';
  end if;

  select count(distinct property_id), min(property_id) into v_property_count, v_property_id
  from reservations where booking_id = p_booking_id;

  if v_property_count = 0 then
    raise exception 'This booking has no rooms to invoice';
  end if;
  if v_property_count > 1 then
    raise exception 'This booking spans multiple properties — generate a separate invoice per property instead of one master invoice';
  end if;

  v_bill_to := case
    when v_booking_type = 'corporate' and v_company_id is not null then 'company'
    when v_booking_type = 'travel_agent' and v_travel_agent_id is not null then 'travel_agent'
    else 'guest'
  end;

  insert into invoices (guest_id, property_id, booking_id, company_id, travel_agent_id, bill_to, status, issued_at, created_by)
  values (v_guest_id, v_property_id, p_booking_id, v_company_id, v_travel_agent_id, v_bill_to, 'draft', now(), p_staff_id)
  returning id into v_invoice_id;

  insert into invoice_line_items (invoice_id, description, source_type, source_table, source_id, quantity, unit_price, amount)
  select v_invoice_id, r.reservation_number || ' — ' || fc.description, fc.charge_type, 'folio_charges', fc.id, 1, fc.amount, fc.amount
  from folio_charges fc
  join reservations r on r.id = fc.reservation_id
  where r.booking_id = p_booking_id
    and fc.id not in (
      select source_id from invoice_line_items where source_table = 'folio_charges' and source_id is not null
    );

  perform recompute_invoice_totals(v_invoice_id);
  update invoices set status = 'issued' where id = v_invoice_id and status = 'draft' and total_amount > 0;

  return v_invoice_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function generate_master_invoice_from_booking(uuid, uuid) to authenticated;
