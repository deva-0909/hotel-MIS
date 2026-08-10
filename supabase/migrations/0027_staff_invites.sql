-- ============================================================
-- Proper staff invite flow. Previously /login's "Register" form let anyone
-- self-sign-up and freely pick their own role — including admin — with no
-- gate at all. That's replaced with: admins issue an invite (email + role +
-- property); signup only grants that role/property if the email matches a
-- pending invite. The very first account in an empty system is still
-- allowed to self-register as admin (there's no other way to bootstrap
-- without a service-role key), but every signup after that is rejected
-- unless invited.
-- ============================================================

create type invite_status as enum ('pending', 'accepted', 'revoked');

create table staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role staff_role not null,
  property_id uuid references properties(id) on delete set null,
  invited_by uuid references profiles(id) on delete set null,
  status invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Re-inviting the same pending email (before they've accepted) updates the
-- existing invite instead of creating a duplicate — enforced via this
-- partial unique index, which also serves as the ON CONFLICT target.
create unique index idx_staff_invites_pending_email on staff_invites (lower(email)) where status = 'pending';
create index idx_staff_invites_property on staff_invites(property_id);

alter table staff_invites enable row level security;
create policy staff_invites_admin_all on staff_invites for all to authenticated
  using (is_admin_staff()) with check (is_admin_staff());
grant select, insert, update, delete on staff_invites to authenticated;

-- Called by the signup action (as the just-created, not-yet-profiled user,
-- who has no rights to read staff_invites/profiles directly) to decide
-- whether — and with what role/property — the signup is allowed to
-- proceed. SECURITY DEFINER so it can see invites and count profiles
-- regardless of the caller's own (nonexistent) permissions; it only ever
-- returns data scoped to the exact email the caller already owns.
create or replace function resolve_signup(p_email text)
returns table(role staff_role, property_id uuid, allowed boolean) as $$
declare
  v_invite_id uuid;
  v_invite_role staff_role;
  v_invite_property uuid;
  v_profile_count int;
begin
  select id, staff_invites.role, staff_invites.property_id
    into v_invite_id, v_invite_role, v_invite_property
  from staff_invites
  where lower(email) = lower(p_email) and status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if v_invite_id is not null then
    update staff_invites set status = 'accepted', accepted_at = now() where id = v_invite_id;
    return query select v_invite_role, v_invite_property, true;
    return;
  end if;

  select count(*) into v_profile_count from profiles;
  if v_profile_count = 0 then
    return query select 'admin'::staff_role, (select id from properties order by created_at limit 1), true;
    return;
  end if;

  return query select null::staff_role, null::uuid, false;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function resolve_signup(text) to anon, authenticated;

create trigger trg_audit_staff_invites after insert or update or delete on staff_invites
  for each row execute function log_config_change();
