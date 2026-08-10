-- ============================================================
-- generate_invoice_from_reservation copies a folio_charge's charge_type
-- straight into invoice_line_items.source_type. 0030_booking_engine_core.sql
-- added 'fee' to folio_charges' allowed charge types (for cancellation/
-- no-show fees) but missed this table's matching constraint — so sweeping
-- a fee charge into an invoice would fail. Bring it in line.
-- ============================================================

alter table invoice_line_items drop constraint invoice_line_items_source_type_check;
alter table invoice_line_items add constraint invoice_line_items_source_type_check
  check (source_type in ('room', 'restaurant', 'service', 'misc', 'fee'));
