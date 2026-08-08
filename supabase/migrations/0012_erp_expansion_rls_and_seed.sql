do $$
declare
  t text;
begin
  foreach t in array array[
    'hotel_settings','hr_employees','attendance_records','leave_requests',
    'housekeeping_tasks','engineering_assets','work_orders',
    'crm_campaigns','crm_leads','banquet_venues','banquet_events',
    'spa_services','spa_bookings','laundry_batches',
    'travel_vehicles','travel_bookings'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_staff_all on %I for all using (is_staff()) with check (is_staff())', t, t);
    execute format('grant select, insert, update, delete on %I to anon, authenticated', t);
  end loop;
end $$;

insert into hotel_settings (corporate_name, region_name, hotel_name, city)
values ('Corporate Office', 'Region', 'Hotel & Restaurant', 'City');

insert into engineering_assets (name, category, location, status, next_service_date) values
  ('Central AC Chiller', 'HVAC', 'Basement Plant Room', 'operational', current_date + 30),
  ('Elevator 1', 'Vertical Transport', 'Lobby', 'operational', current_date + 20),
  ('DG Set 500kVA', 'Power', 'Utility Yard', 'operational', current_date + 60),
  ('STP Plant', 'Utilities', 'Basement', 'operational', current_date + 90),
  ('Kitchen Exhaust Hood', 'Kitchen Equipment', 'Main Kitchen', 'operational', current_date + 25),
  ('Fire Pump System', 'Safety', 'Basement', 'operational', current_date + 45);

insert into banquet_venues (name, capacity) values
  ('Grand Hall', 500),
  ('Terrace Room', 100),
  ('Boardroom A', 40);

insert into spa_services (name, duration_minutes, price) values
  ('Deep Tissue Massage', 60, 3500),
  ('Facial', 45, 2500),
  ('Manicure', 30, 1200),
  ('Couples Massage', 90, 7000);

insert into travel_vehicles (name, vehicle_type, status) values
  ('Sedan 01', 'Sedan', 'available'),
  ('Sedan 02', 'Sedan', 'available'),
  ('SUV 01', 'SUV', 'available'),
  ('Tempo Traveller', 'Van', 'available');
