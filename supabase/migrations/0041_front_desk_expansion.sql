-- ============================================================
-- Front-desk expansion: structured early check-in/late checkout, digital
-- KYC (passport/visa fields + document uploads), signature capture,
-- multi-guest occupant roster, and company/agent-billed + group-level
-- invoicing. Additive only — every new column/table is nullable or
-- defaulted so nothing existing changes behavior until used.
-- ============================================================

alter table reservations add column early_checkin boolean not null default false;
alter table reservations add column late_checkout boolean not null default false;
alter table reservations add column signature_path text;

alter table guests add column nationality text;
alter table guests add column passport_number text;
alter table guests add column passport_country text;
alter table guests add column passport_expiry date;
alter table guests add column visa_number text;
alter table guests add column visa_expiry date;

-- Named occupants beyond the single booking guest — real KYC compliance
-- (India's hotel-registration rules, and most others) requires every adult
-- occupant's ID on file, not just the person who made the booking.
create table reservation_occupants (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  full_name text not null,
  age_category text not null default 'adult' check (age_category in ('adult', 'child')),
  id_proof_type text,
  id_proof_number text,
  created_at timestamptz not null default now()
);

create index idx_reservation_occupants_reservation on reservation_occupants(reservation_id);

alter table reservation_occupants enable row level security;
create policy reservation_occupants_all on reservation_occupants for all to authenticated
  using (is_staff_for_property((select property_id from reservations where id = reservation_id)))
  with check (is_staff_for_property((select property_id from reservations where id = reservation_id)));
grant select, insert, update, delete on reservation_occupants to authenticated;

-- Scanned ID/passport/visa documents. Scoped like guests themselves
-- (global, not per-property) since a guest's document should be visible
-- to any property they're staying at.
create table guest_documents (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  document_type text not null check (document_type in ('id_proof', 'passport', 'visa', 'other')),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create index idx_guest_documents_guest on guest_documents(guest_id);

alter table guest_documents enable row level security;
create policy guest_documents_all on guest_documents for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on guest_documents to authenticated;

-- Private storage for ID scans and check-in signatures — not public, only
-- reachable by an authenticated staff member (or a signed URL a server
-- action issues), same coarse "any staff" trust level already used for
-- guests/companies elsewhere in this schema.
insert into storage.buckets (id, name, public) values ('guest-documents', 'guest-documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('guest-signatures', 'guest-signatures', false) on conflict (id) do nothing;

create policy "staff manage guest-documents" on storage.objects
  for all to authenticated
  using (bucket_id = 'guest-documents' and is_staff())
  with check (bucket_id = 'guest-documents' and is_staff());

create policy "staff manage guest-signatures" on storage.objects
  for all to authenticated
  using (bucket_id = 'guest-signatures' and is_staff())
  with check (bucket_id = 'guest-signatures' and is_staff());

-- Company/travel-agent billing on the invoice itself (previously only the
-- booking tracked who's responsible; the invoice always billed the guest
-- regardless), plus an optional booking_id for a group/master invoice that
-- spans every room in a booking instead of just one reservation.
alter table invoices add column company_id uuid references companies(id) on delete set null;
alter table invoices add column travel_agent_id uuid references travel_agents(id) on delete set null;
alter table invoices add column bill_to text not null default 'guest' check (bill_to in ('guest', 'company', 'travel_agent'));
alter table invoices add column booking_id uuid references bookings(id) on delete set null;

create index idx_invoices_booking on invoices(booking_id);
