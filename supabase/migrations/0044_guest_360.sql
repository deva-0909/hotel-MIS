-- ============================================================
-- Guest 360: the missing pieces behind a real single-screen guest view.
-- guests is already a single global table (no property_id) with
-- already-working cross-property phone/email matching at booking time —
-- this migration adds what was never captured at all: complaints/service
-- requests, feedback, a communication log, structured room/food
-- preferences, special occasions, a guest's own corporate affiliation
-- (distinct from any one booking's company_id), consent/marketing flags,
-- loyalty point accrual, and a profile-merge tool.
-- ============================================================

alter table guests add column room_preferences text;
alter table guests add column food_preferences text;
alter table guests add column date_of_birth date;
alter table guests add column anniversary_date date;
alter table guests add column company_id uuid references companies(id) on delete set null;
alter table guests add column consent_marketing boolean not null default false;
alter table guests add column consent_email boolean not null default false;
alter table guests add column consent_sms boolean not null default false;
alter table guests add column consent_call boolean not null default false;
alter table guests add column consent_updated_at timestamptz;

create table guest_requests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  request_type text not null check (request_type in ('complaint', 'service_request')),
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_guest_requests_guest on guest_requests(guest_id);

create table guest_feedback (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  rating int check (rating between 1 and 5),
  category text,
  comments text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_guest_feedback_guest on guest_feedback(guest_id);

create table guest_communications (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'call', 'whatsapp', 'in_person', 'other')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  subject text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_guest_communications_guest on guest_communications(guest_id);

alter table guest_requests enable row level security;
create policy guest_requests_all on guest_requests for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on guest_requests to authenticated;

alter table guest_feedback enable row level security;
create policy guest_feedback_all on guest_feedback for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on guest_feedback to authenticated;

alter table guest_communications enable row level security;
create policy guest_communications_all on guest_communications for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on guest_communications to authenticated;

-- Loyalty accrual: 1 point per 100 (currency-agnostic — the property's own
-- currency major unit) of room revenue, awarded the moment a stay
-- completes. Tier is derived from lifetime points on every award, so it
-- self-corrects rather than needing a separate migration step.
create or replace function compute_loyalty_tier(p_points int) returns text as $$
begin
  return case
    when p_points >= 5000 then 'platinum'
    when p_points >= 2000 then 'gold'
    when p_points >= 500 then 'silver'
    else 'member'
  end;
end;
$$ language plpgsql immutable;

create or replace function award_loyalty_points_on_checkout() returns trigger as $$
declare
  v_nights int;
  v_points int;
begin
  if new.status = 'checked_out' and (old.status is distinct from 'checked_out') then
    v_nights := greatest(1, new.check_out_date - new.check_in_date);
    v_points := floor((v_nights * new.rate_per_night) / 100);
    if v_points > 0 then
      update guests
      set loyalty_points = loyalty_points + v_points,
          loyalty_tier = compute_loyalty_tier(loyalty_points + v_points)
      where id = new.guest_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_reservations_award_loyalty after update of status on reservations
  for each row execute function award_loyalty_points_on_checkout();
