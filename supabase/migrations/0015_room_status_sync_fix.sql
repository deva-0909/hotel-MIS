-- The room<->reservation status sync trigger only fired on `status` column
-- changes, so assignRoom() (which sets room_id on an already-confirmed
-- reservation, e.g. attaching a room after unassigned booking) never ran it.
-- The room kept showing as 'available', so a second reservation could pick
-- the same room for overlapping dates with zero warning. Widen the trigger
-- to also fire on room_id changes and treat a newly-attached room as an
-- assignment event even when status itself didn't move off 'confirmed'.
create or replace function sync_room_status_on_reservation() returns trigger as $$
begin
  if new.status = 'checked_in' and new.room_id is not null then
    update rooms set status = 'occupied' where id = new.room_id;
  elsif new.status = 'checked_out' and new.room_id is not null then
    update rooms set status = 'dirty' where id = new.room_id;
  elsif new.status = 'confirmed' and new.room_id is not null
        and (old.status is null or old.status <> 'confirmed' or old.room_id is distinct from new.room_id) then
    update rooms set status = 'reserved' where id = new.room_id and status = 'available';
  elsif new.status in ('cancelled', 'no_show') and new.room_id is not null then
    update rooms set status = 'available' where id = new.room_id and status = 'reserved';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists trg_reservations_room_status on reservations;
create trigger trg_reservations_room_status after insert or update of status, room_id on reservations
  for each row execute function sync_room_status_on_reservation();
