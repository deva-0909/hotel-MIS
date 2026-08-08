-- ============================================================
-- Hotel & Restaurant MS — Hotel front office
-- Room types, rooms, guests, reservations, folio charges
-- ============================================================

create type room_status as enum (
  'available', 'occupied', 'reserved', 'dirty', 'maintenance', 'out_of_order'
);

create type reservation_status as enum (
  'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
);

create table room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_rate numeric(12,2) not null default 0,
  max_occupancy int not null default 2,
  description text,
  amenities text,
  created_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique,
  room_type_id uuid not null references room_types(id),
  floor text,
  status room_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rooms_status on rooms(status);

create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  id_proof_type text,
  id_proof_number text,
  address text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_guests_phone on guests(phone);
create index idx_guests_name on guests using gin (to_tsvector('simple', full_name));

create table reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique default next_doc_number('RES', 'reservation_number_seq'),
  guest_id uuid not null references guests(id),
  room_id uuid references rooms(id),
  room_type_id uuid not null references room_types(id),
  check_in_date date not null,
  check_out_date date not null,
  actual_check_in_at timestamptz,
  actual_check_out_at timestamptz,
  adults int not null default 1,
  children int not null default 0,
  rate_per_night numeric(12,2) not null default 0,
  status reservation_status not null default 'confirmed',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out_date > check_in_date)
);

create index idx_reservations_guest on reservations(guest_id);
create index idx_reservations_room on reservations(room_id);
create index idx_reservations_status on reservations(status);
create index idx_reservations_dates on reservations(check_in_date, check_out_date);

-- Charges posted to a guest's room folio: room nights, restaurant orders billed to
-- room, misc services. Restaurant orders insert here via trigger (see 0003).
create table folio_charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  charge_type text not null check (charge_type in ('room', 'restaurant', 'service', 'misc')),
  description text not null,
  amount numeric(12,2) not null,
  source_table text,
  source_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_folio_charges_reservation on folio_charges(reservation_id);

create trigger trg_rooms_updated before update on rooms
  for each row execute function set_updated_at();
create trigger trg_guests_updated before update on guests
  for each row execute function set_updated_at();
create trigger trg_reservations_updated before update on reservations
  for each row execute function set_updated_at();

-- Room status follows check-in/out transitions automatically
create or replace function sync_room_status_on_reservation() returns trigger as $$
begin
  if new.status = 'checked_in' and new.room_id is not null then
    update rooms set status = 'occupied' where id = new.room_id;
  elsif new.status = 'checked_out' and new.room_id is not null then
    update rooms set status = 'dirty' where id = new.room_id;
  elsif new.status = 'confirmed' and new.room_id is not null and (old.status is null or old.status <> 'confirmed') then
    update rooms set status = 'reserved' where id = new.room_id and status = 'available';
  elsif new.status in ('cancelled', 'no_show') and new.room_id is not null then
    update rooms set status = 'available' where id = new.room_id and status = 'reserved';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_reservations_room_status after insert or update of status on reservations
  for each row execute function sync_room_status_on_reservation();

-- Post a room-night charge to the folio automatically when a reservation is checked out
create or replace function post_room_charge_on_checkout() returns trigger as $$
declare
  nights int;
begin
  if new.status = 'checked_out' and (old.status is distinct from 'checked_out') then
    nights := greatest(1, new.check_out_date - new.check_in_date);
    insert into folio_charges (reservation_id, charge_type, description, amount, source_table, source_id)
    values (new.id, 'room', format('Room charge (%s night%s)', nights, case when nights = 1 then '' else 's' end),
            nights * new.rate_per_night, 'reservations', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_reservations_post_room_charge after update of status on reservations
  for each row execute function post_room_charge_on_checkout();
