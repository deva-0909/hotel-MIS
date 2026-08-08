-- ============================================================
-- Hotel & Restaurant MS — Security hardening
-- Pin search_path on all functions; lock RPC-exposed
-- SECURITY DEFINER functions down to active staff only.
-- ============================================================

alter function set_updated_at() set search_path = public;
alter function next_doc_number(text, text) set search_path = public;
alter function sync_room_status_on_reservation() set search_path = public;
alter function post_room_charge_on_checkout() set search_path = public;
alter function sync_table_status_on_order() set search_path = public;
alter function post_restaurant_charge_on_bill() set search_path = public;
alter function apply_stock_movement() set search_path = public;
alter function recompute_invoice_totals(uuid) set search_path = public;
alter function trg_invoice_line_items_recompute() set search_path = public;
alter function trg_payments_recompute() set search_path = public;

-- is_staff() must stay callable by `authenticated` (RLS policies invoke it as
-- the querying role) but has no reason to be reachable by anonymous callers.
revoke execute on function is_staff() from anon, public;
grant execute on function is_staff() to authenticated;

-- These two bypass RLS (SECURITY DEFINER) to do multi-table writes, so guard
-- them with an explicit staff check and keep them off the anon role entirely.
create or replace function receive_po_item(p_po_item_id uuid, p_quantity numeric, p_staff_id uuid)
returns void as $$
declare
  v_item_id uuid;
  v_po_id uuid;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select inventory_item_id, po_id into v_item_id, v_po_id
  from purchase_order_items where id = p_po_item_id;

  update purchase_order_items set received_quantity = received_quantity + p_quantity
  where id = p_po_item_id;

  insert into stock_movements (inventory_item_id, movement_type, quantity, reference_table, reference_id, created_by)
  values (v_item_id, 'purchase_receipt', p_quantity, 'purchase_orders', v_po_id, p_staff_id);

  update purchase_orders po set status = case
    when (select bool_and(received_quantity >= quantity) from purchase_order_items where po_id = po.id) then 'received'::po_status
    else 'partially_received'::po_status
  end
  where po.id = v_po_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function generate_invoice_from_reservation(p_reservation_id uuid, p_staff_id uuid)
returns uuid as $$
declare
  v_guest_id uuid;
  v_invoice_id uuid;
begin
  if not is_staff() then
    raise exception 'not authorized';
  end if;

  select guest_id into v_guest_id from reservations where id = p_reservation_id;

  insert into invoices (guest_id, reservation_id, status, issued_at, created_by)
  values (v_guest_id, p_reservation_id, 'draft', now(), p_staff_id)
  returning id into v_invoice_id;

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

revoke execute on function receive_po_item(uuid, numeric, uuid) from anon, public;
grant execute on function receive_po_item(uuid, numeric, uuid) to authenticated;

revoke execute on function generate_invoice_from_reservation(uuid, uuid) from anon, public;
grant execute on function generate_invoice_from_reservation(uuid, uuid) to authenticated;
