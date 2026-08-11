-- ============================================================
-- min(uuid) isn't a valid Postgres aggregate (uuid has no default
-- ordering operator class for it) — generate_master_invoice_from_booking
-- failed on its very first real call. Split into two plain queries
-- instead of one combined aggregate.
-- ============================================================

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

  select count(distinct property_id) into v_property_count from reservations where booking_id = p_booking_id;
  select property_id into v_property_id from reservations where booking_id = p_booking_id limit 1;

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
