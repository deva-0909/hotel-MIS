-- ============================================================
-- Property working hours: per-day open/close (or closed), used to gate
-- restaurant order creation. Defaults every property to open 24 hours
-- every day, so nothing is newly restricted until an admin actually
-- configures narrower hours.
-- ============================================================

alter table properties add column working_hours jsonb not null default '{
  "monday": {"open": "00:00", "close": "23:59", "closed": false},
  "tuesday": {"open": "00:00", "close": "23:59", "closed": false},
  "wednesday": {"open": "00:00", "close": "23:59", "closed": false},
  "thursday": {"open": "00:00", "close": "23:59", "closed": false},
  "friday": {"open": "00:00", "close": "23:59", "closed": false},
  "saturday": {"open": "00:00", "close": "23:59", "closed": false},
  "sunday": {"open": "00:00", "close": "23:59", "closed": false}
}'::jsonb;
