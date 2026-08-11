-- ============================================================
-- Merges a duplicate guest profile into the profile that should have been
-- used all along: every table with a guest_id (12 of them — bookings,
-- reservations, invoices, orders, spa/laundry/travel bookings, waitlist,
-- documents, requests, feedback, communications) gets repointed from the
-- source to the target, loyalty points are combined, and any target field
-- left blank is backfilled from the source before the empty source row is
-- deleted. Existing non-blank target values are never overwritten — this
-- fills gaps, it doesn't pick a "winner" and discard the other profile's
-- details.
-- ============================================================

create or replace function merge_guest_profiles(p_source_guest_id uuid, p_target_guest_id uuid)
returns void as $$
declare
  v_source_points int;
  v_target_points int;
  v_combined_points int;
begin
  if p_source_guest_id = p_target_guest_id then
    raise exception 'Cannot merge a guest profile into itself';
  end if;
  if not exists (select 1 from guests where id = p_source_guest_id) or not exists (select 1 from guests where id = p_target_guest_id) then
    raise exception 'One of the guest profiles was not found';
  end if;

  update bookings set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update reservations set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update invoices set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update orders set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update spa_bookings set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update laundry_batches set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update travel_bookings set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update waitlist_entries set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update guest_documents set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update guest_requests set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update guest_feedback set guest_id = p_target_guest_id where guest_id = p_source_guest_id;
  update guest_communications set guest_id = p_target_guest_id where guest_id = p_source_guest_id;

  select loyalty_points into v_source_points from guests where id = p_source_guest_id;
  select loyalty_points into v_target_points from guests where id = p_target_guest_id;
  v_combined_points := coalesce(v_source_points, 0) + coalesce(v_target_points, 0);

  update guests target
  set loyalty_points = v_combined_points,
      loyalty_tier = compute_loyalty_tier(v_combined_points),
      phone = coalesce(nullif(target.phone, ''), source.phone),
      email = coalesce(nullif(target.email, ''), source.email),
      address = coalesce(nullif(target.address, ''), source.address),
      id_proof_type = coalesce(nullif(target.id_proof_type, ''), source.id_proof_type),
      id_proof_number = coalesce(nullif(target.id_proof_number, ''), source.id_proof_number),
      nationality = coalesce(nullif(target.nationality, ''), source.nationality),
      passport_number = coalesce(nullif(target.passport_number, ''), source.passport_number),
      passport_country = coalesce(nullif(target.passport_country, ''), source.passport_country),
      passport_expiry = coalesce(target.passport_expiry, source.passport_expiry),
      visa_number = coalesce(nullif(target.visa_number, ''), source.visa_number),
      visa_expiry = coalesce(target.visa_expiry, source.visa_expiry),
      preferences = coalesce(nullif(target.preferences, ''), source.preferences),
      room_preferences = coalesce(nullif(target.room_preferences, ''), source.room_preferences),
      food_preferences = coalesce(nullif(target.food_preferences, ''), source.food_preferences),
      notes = coalesce(nullif(target.notes, ''), source.notes),
      date_of_birth = coalesce(target.date_of_birth, source.date_of_birth),
      anniversary_date = coalesce(target.anniversary_date, source.anniversary_date),
      company_id = coalesce(target.company_id, source.company_id),
      consent_marketing = target.consent_marketing or source.consent_marketing,
      consent_email = target.consent_email or source.consent_email,
      consent_sms = target.consent_sms or source.consent_sms,
      consent_call = target.consent_call or source.consent_call
  from guests source
  where target.id = p_target_guest_id and source.id = p_source_guest_id;

  delete from guests where id = p_source_guest_id;
end;
$$ language plpgsql set search_path = public;

grant execute on function merge_guest_profiles(uuid, uuid) to authenticated;
