-- ============================================================
-- Cross-property dining: a guest staying at one property can order at a
-- restaurant on a different property and still bill to their own room
-- folio. The billing trigger (post_restaurant_charge_on_bill) already
-- keys folio_charges off orders.reservation_id alone, with no property
-- check — the only blocker is that reservations_property_all only let
-- staff read reservations at their own property, so a waiter at
-- Property B could never find a Property A guest to bill to. Split the
-- policy: reads open up to any staff (needed to search/select a guest
-- from another property), writes stay scoped to the reservation's own
-- property as before.
-- ============================================================

drop policy if exists reservations_property_all on reservations;

create policy reservations_read on reservations for select to authenticated using (is_staff());
create policy reservations_insert on reservations for insert to authenticated with check (is_staff_for_property(property_id));
create policy reservations_update on reservations for update to authenticated using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
create policy reservations_delete on reservations for delete to authenticated using (is_staff_for_property(property_id));

grant select, insert, update, delete on reservations to authenticated;
