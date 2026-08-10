-- ============================================================
-- Configuration audit trail: who changed what, when. A single generic
-- trigger function is attached to each config table we care about
-- (properties, tax_rates, devices, restaurants, profiles — plus stores /
-- pos_terminals added by later migrations) so every insert/update/delete
-- is captured without one-off logging code scattered through server
-- actions.
-- ============================================================

-- property_id is nullable: a profile row can be created before it's ever
-- assigned a property (bootstrap admin, or a staff member awaiting
-- assignment), and its audit entries must still be captured rather than
-- failing the underlying update.
create table config_audit_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index idx_config_audit_log_property on config_audit_log(property_id, changed_at desc);
create index idx_config_audit_log_table on config_audit_log(table_name, record_id);

alter table config_audit_log enable row level security;
-- Property-less entries (no property assigned yet) are admin-only; everything
-- else follows the usual is_staff_for_property rule.
create policy config_audit_log_read on config_audit_log for select to authenticated using (
  case when property_id is null then is_admin_staff() else is_staff_for_property(property_id) end
);
grant select on config_audit_log to authenticated;

-- Runs as the function owner (bypasses config_audit_log's RLS on insert,
-- same pattern as receive_stock_transfer) so any staff member's config
-- change gets logged regardless of their own audit-table permissions.
create or replace function log_config_change() returns trigger as $$
declare
  v_property_id uuid;
  v_record_id uuid;
begin
  if TG_TABLE_NAME = 'properties' then
    v_property_id := coalesce(new.id, old.id);
  else
    v_property_id := coalesce(new.property_id, old.property_id);
  end if;
  v_record_id := coalesce(new.id, old.id);

  insert into config_audit_log (property_id, table_name, record_id, action, changed_by, old_data, new_data)
  values (
    v_property_id,
    TG_TABLE_NAME,
    v_record_id,
    lower(TG_OP),
    auth.uid(),
    case when TG_OP = 'DELETE' then to_jsonb(old) else null end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_properties after insert or update or delete on properties
  for each row execute function log_config_change();
create trigger trg_audit_tax_rates after insert or update or delete on tax_rates
  for each row execute function log_config_change();
create trigger trg_audit_devices after insert or update or delete on devices
  for each row execute function log_config_change();
create trigger trg_audit_restaurants after insert or update or delete on restaurants
  for each row execute function log_config_change();
create trigger trg_audit_profiles after update on profiles
  for each row execute function log_config_change();
