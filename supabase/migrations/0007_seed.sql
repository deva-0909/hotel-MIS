-- ============================================================
-- Hotel & Restaurant MS — Starter reference data
-- ============================================================

insert into room_types (name, base_rate, max_occupancy, description, amenities) values
  ('Standard', 2500, 2, 'Comfortable standard room', 'AC, TV, Wi-Fi'),
  ('Deluxe', 4000, 3, 'Spacious deluxe room with city view', 'AC, TV, Wi-Fi, Mini bar'),
  ('Suite', 7500, 4, 'Suite with separate living area', 'AC, TV, Wi-Fi, Mini bar, Bathtub');

insert into rooms (room_number, room_type_id, floor, status)
select r.room_number, rt.id, r.floor, 'available'
from (values
  ('101', '1', 'Standard'), ('102', '1', 'Standard'), ('103', '1', 'Standard'),
  ('201', '2', 'Deluxe'), ('202', '2', 'Deluxe'),
  ('301', '3', 'Suite')
) as r(room_number, floor, type_name)
join room_types rt on rt.name = r.type_name;

insert into restaurant_tables (table_number, capacity) values
  ('T1', 2), ('T2', 2), ('T3', 4), ('T4', 4), ('T5', 6), ('T6', 6);

insert into menu_categories (name, sort_order) values
  ('Starters', 1), ('Main Course', 2), ('Breads', 3), ('Beverages', 4), ('Desserts', 5);

insert into menu_items (category_id, name, price, is_veg, description)
select mc.id, i.name, i.price, i.is_veg, i.description
from (values
  ('Starters', 'Veg Spring Rolls', 220, true, 'Crispy rolls with vegetable filling'),
  ('Starters', 'Chicken Tikka', 320, false, 'Grilled marinated chicken'),
  ('Main Course', 'Paneer Butter Masala', 320, true, 'Cottage cheese in tomato gravy'),
  ('Main Course', 'Butter Chicken', 380, false, 'Chicken in creamy tomato gravy'),
  ('Main Course', 'Dal Makhani', 260, true, 'Slow-cooked black lentils'),
  ('Breads', 'Butter Naan', 60, true, 'Leavened bread with butter'),
  ('Breads', 'Tandoori Roti', 40, true, 'Whole wheat bread'),
  ('Beverages', 'Fresh Lime Soda', 120, true, 'Sweet or salted'),
  ('Beverages', 'Masala Chai', 80, true, 'Spiced Indian tea'),
  ('Desserts', 'Gulab Jamun', 150, true, 'Milk dumplings in sugar syrup')
) as i(category_name, name, price, is_veg, description)
join menu_categories mc on mc.name = i.category_name;

insert into inventory_categories (name) values
  ('Kitchen & Groceries'), ('Beverages'), ('Housekeeping Supplies'), ('Linen & Amenities');

insert into inventory_items (category_id, name, unit, current_stock, reorder_level, unit_cost)
select ic.id, i.name, i.unit, i.current_stock, i.reorder_level, i.unit_cost
from (values
  ('Kitchen & Groceries', 'Basmati Rice', 'kg', 50, 20, 90),
  ('Kitchen & Groceries', 'Paneer', 'kg', 15, 10, 320),
  ('Kitchen & Groceries', 'Chicken', 'kg', 20, 15, 220),
  ('Kitchen & Groceries', 'Cooking Oil', 'l', 30, 15, 140),
  ('Beverages', 'Mineral Water Bottles', 'pcs', 200, 100, 15),
  ('Beverages', 'Tea Leaves', 'kg', 8, 3, 450),
  ('Housekeeping Supplies', 'Floor Cleaner', 'l', 25, 10, 110),
  ('Linen & Amenities', 'Bath Towels', 'pcs', 60, 30, 250),
  ('Linen & Amenities', 'Bedsheets', 'pcs', 40, 20, 400)
) as i(category_name, name, unit, current_stock, reorder_level, unit_cost)
join inventory_categories ic on ic.name = i.category_name;

insert into suppliers (name, contact_person, phone, email) values
  ('Fresh Farm Produce Co.', 'Ramesh Kumar', '9876543210', 'orders@freshfarm.example'),
  ('City Beverage Distributors', 'Sunita Rao', '9876501234', 'sales@citybev.example'),
  ('Comfort Linen Supplies', 'Anil Mehta', '9876512345', 'info@comfortlinen.example');
