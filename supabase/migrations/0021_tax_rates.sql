-- ============================================================
-- Property-specific tax rates, auto-applied to invoices.
-- Replaces the old flow where staff typed a tax_amount by hand:
-- recompute_invoice_totals (already the single trigger-driven hook every
-- invoice-creation path runs through — folio checkout, restaurant billing,
-- and manual invoices alike) now derives tax_amount itself by summing each
-- line item's amount against whichever active rates apply to its
-- source_type. Rates for the same applies_to stack (so e.g. CGST 6% +
-- SGST 6% behaves the same as one 12% row), matching how Indian GST is
-- commonly split across two line items.
-- ============================================================

create table tax_rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  rate_percent numeric(5,2) not null check (rate_percent >= 0 and rate_percent <= 100),
  applies_to text not null check (applies_to in ('room', 'restaurant', 'service', 'misc', 'all')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_tax_rates_property on tax_rates(property_id);

alter table tax_rates enable row level security;
create policy tax_rates_all on tax_rates for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on tax_rates to authenticated;

create or replace function recompute_invoice_totals(p_invoice_id uuid) returns void as $$
declare
  v_property_id uuid;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
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

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = p_invoice_id;

  update invoices
  set subtotal = v_subtotal,
      tax_amount = v_tax,
      total_amount = v_subtotal + v_tax - discount_amount,
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
$$ language plpgsql set search_path = public;
