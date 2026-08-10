-- ============================================================
-- Booking engine, part 2: refunds and waitlists.
-- ============================================================

alter type invoice_status add value if not exists 'refunded';

alter table invoices add column refunded_amount numeric(12,2) not null default 0;

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  refunded_by uuid references profiles(id),
  refunded_at timestamptz not null default now()
);

create index idx_refunds_payment on refunds(payment_id);

-- Can't refund more than a payment's own amount, net of refunds already
-- issued against it — otherwise a payment could be refunded into negative
-- territory.
create or replace function validate_refund_amount() returns trigger as $$
declare
  v_payment_amount numeric(12,2);
  v_already_refunded numeric(12,2);
begin
  select amount into v_payment_amount from payments where id = new.payment_id;
  select coalesce(sum(amount), 0) into v_already_refunded from refunds where payment_id = new.payment_id and id <> new.id;

  if v_already_refunded + new.amount > v_payment_amount then
    raise exception 'Refund amount (%) exceeds the remaining refundable balance (%) on this payment', new.amount, v_payment_amount - v_already_refunded;
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_refunds_validate before insert or update on refunds
  for each row execute function validate_refund_amount();

-- recompute_invoice_totals (0021_tax_rates.sql) nets payments against
-- refunds so amount_paid reflects what the guest actually still has paid,
-- and reports a distinct 'refunded' status once a fully-paid invoice is
-- refunded back down to zero.
create or replace function recompute_invoice_totals(p_invoice_id uuid) returns void as $$
declare
  v_property_id uuid;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_gross_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_paid numeric(12,2);
  v_total numeric(12,2);
  v_status invoice_status;
begin
  select property_id into v_property_id from invoices where id = p_invoice_id;

  select coalesce(sum(amount), 0) into v_subtotal from invoice_line_items where invoice_id = p_invoice_id;

  select coalesce(sum(
    li.amount * coalesce((
      select sum(tr.rate_percent) from tax_rates tr
      where tr.property_id = v_property_id and tr.is_active
        and (tr.applies_to = li.source_type or tr.applies_to = 'all')
    ), 0) / 100
  ), 0) into v_tax
  from invoice_line_items li
  where li.invoice_id = p_invoice_id;

  select coalesce(sum(p.amount), 0) into v_gross_paid from payments p where p.invoice_id = p_invoice_id;
  select coalesce(sum(r.amount), 0) into v_refunded from refunds r
    join payments p on p.id = r.payment_id
    where p.invoice_id = p_invoice_id;
  v_paid := v_gross_paid - v_refunded;

  update invoices
  set subtotal = v_subtotal,
      tax_amount = v_tax,
      total_amount = v_subtotal + v_tax - discount_amount,
      amount_paid = v_paid,
      refunded_amount = v_refunded
  where id = p_invoice_id
  returning total_amount into v_total;

  v_status := case
    when v_total <= 0 then 'draft'
    when v_refunded > 0 and v_paid <= 0 then 'refunded'
    when v_paid <= 0 then 'issued'
    when v_paid < v_total then 'partially_paid'
    else 'paid'
  end;

  update invoices set status = v_status
  where id = p_invoice_id and status <> 'cancelled';
end;
$$ language plpgsql set search_path = public;

create or replace function trg_refunds_recompute() returns trigger as $$
declare
  v_invoice_id uuid;
begin
  select invoice_id into v_invoice_id from payments where id = coalesce(new.payment_id, old.payment_id);
  perform recompute_invoice_totals(v_invoice_id);
  return coalesce(new, old);
end;
$$ language plpgsql set search_path = public;

create trigger trg_refunds_change after insert or update or delete on refunds
  for each row execute function trg_refunds_recompute();

alter table refunds enable row level security;
create policy refunds_read on refunds for select to authenticated using (
  is_staff_for_property((select property_id from invoices i join payments p on p.invoice_id = i.id where p.id = payment_id))
);
create policy refunds_insert on refunds for insert to authenticated with check (
  is_staff_for_property((select property_id from invoices i join payments p on p.invoice_id = i.id where p.id = payment_id))
);
grant select, insert on refunds to authenticated;

-- ---------- Waitlist ----------

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  guest_id uuid not null references guests(id),
  room_type_id uuid not null references room_types(id),
  requested_check_in date not null,
  requested_check_out date not null,
  party_size int not null default 1,
  status text not null default 'waiting' check (status in ('waiting', 'converted', 'cancelled')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (requested_check_out > requested_check_in)
);

create index idx_waitlist_property on waitlist_entries(property_id, status);
create index idx_waitlist_room_type on waitlist_entries(room_type_id);

alter table waitlist_entries enable row level security;
create policy waitlist_entries_all on waitlist_entries for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on waitlist_entries to authenticated;
