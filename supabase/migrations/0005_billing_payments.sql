-- ============================================================
-- Hotel & Restaurant MS — Billing & payments
-- Unified invoices across room + restaurant + service charges
-- ============================================================

create type invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
create type payment_method as enum ('cash', 'card', 'upi', 'bank_transfer', 'other');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default next_doc_number('INV', 'invoice_number_seq'),
  guest_id uuid not null references guests(id),
  reservation_id uuid references reservations(id),
  order_id uuid references orders(id),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  issued_at timestamptz,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_guest on invoices(guest_id);
create index idx_invoices_reservation on invoices(reservation_id);
create index idx_invoices_status on invoices(status);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  source_type text not null check (source_type in ('room', 'restaurant', 'service', 'misc')),
  source_table text,
  source_id uuid,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index idx_invoice_line_items_invoice on invoice_line_items(invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  amount numeric(12,2) not null check (amount > 0),
  method payment_method not null default 'cash',
  reference_number text,
  paid_at timestamptz not null default now(),
  received_by uuid references profiles(id)
);

create index idx_payments_invoice on payments(invoice_id);

create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();

-- Keep invoice totals/status derived from their line items and payments
create or replace function recompute_invoice_totals(p_invoice_id uuid) returns void as $$
declare
  v_subtotal numeric(12,2);
  v_paid numeric(12,2);
  v_total numeric(12,2);
  v_status invoice_status;
begin
  select coalesce(sum(amount), 0) into v_subtotal from invoice_line_items where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = p_invoice_id;

  update invoices
  set subtotal = v_subtotal,
      total_amount = v_subtotal + tax_amount - discount_amount,
      amount_paid = v_paid
  where id = p_invoice_id
  returning total_amount into v_total;

  v_status := case
    when v_total <= 0 then 'draft'
    when v_paid <= 0 then 'issued'
    when v_paid < v_total then 'partially_paid'
    else 'paid'
  end;

  update invoices set status = v_status
  where id = p_invoice_id and status <> 'cancelled';
end;
$$ language plpgsql;

create or replace function trg_invoice_line_items_recompute() returns trigger as $$
begin
  perform recompute_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_invoice_line_items_change after insert or update or delete on invoice_line_items
  for each row execute function trg_invoice_line_items_recompute();

create or replace function trg_payments_recompute() returns trigger as $$
begin
  perform recompute_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_payments_change after insert or update or delete on payments
  for each row execute function trg_payments_recompute();

-- Build a checkout invoice from a reservation's unbilled folio charges
create or replace function generate_invoice_from_reservation(p_reservation_id uuid, p_staff_id uuid)
returns uuid as $$
declare
  v_guest_id uuid;
  v_invoice_id uuid;
begin
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
