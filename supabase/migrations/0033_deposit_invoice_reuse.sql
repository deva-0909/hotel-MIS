-- ============================================================
-- generate_invoice_from_reservation always created a brand-new invoice.
-- That's fine when it's only ever called once (at checkout), but deposits
-- (collected before checkout) now create an early invoice too — reuse it
-- here instead of leaving the deposit stranded on a separate invoice from
-- the final room-charge bill.
-- ============================================================

create or replace function generate_invoice_from_reservation(p_reservation_id uuid, p_staff_id uuid)
returns uuid as $$
declare
  v_guest_id uuid;
  v_property_id uuid;
  v_invoice_id uuid;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select id into v_invoice_id from invoices
  where reservation_id = p_reservation_id and status <> 'cancelled'
  order by created_at
  limit 1;

  if v_invoice_id is null then
    select guest_id, property_id into v_guest_id, v_property_id from reservations where id = p_reservation_id;

    insert into invoices (guest_id, reservation_id, status, issued_at, created_by, property_id)
    values (v_guest_id, p_reservation_id, 'draft', now(), p_staff_id, v_property_id)
    returning id into v_invoice_id;
  end if;

  insert into invoice_line_items (invoice_id, description, source_type, source_table, source_id, quantity, unit_price, amount)
  select v_invoice_id, fc.description, fc.charge_type, 'folio_charges', fc.id, 1, fc.amount, fc.amount
  from folio_charges fc
  where fc.reservation_id = p_reservation_id
    and fc.id not in (
      select source_id from invoice_line_items where source_table = 'folio_charges' and source_id is not null
    );

  perform recompute_invoice_totals(v_invoice_id);
  update invoices set status = 'issued' where id = v_invoice_id and status = 'draft' and total_amount > 0;

  return v_invoice_id;
end;
$$ language plpgsql security definer set search_path = public;
