-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role) VALUES 
  ('admin', 'admin@bijnorservices.in', 'eeea7af566eaa1ec19871a5074808e5bd4df3e28644fab20e81ebfc69ca6bb8a', 'System Administrator', 'admin'),
  ('staff1', 'staff@bijnorservices.in', 'eeea7af566eaa1ec19871a5074808e5bd4df3e28644fab20e81ebfc69ca6bb8a', 'Service Staff', 'staff');

-- Insert popular Samsung device models
INSERT OR IGNORE INTO device_models (model_name, brand, category) VALUES 
  ('Galaxy S24 Ultra', 'Samsung', 'phone'),
  ('Galaxy S24+', 'Samsung', 'phone'),
  ('Galaxy S24', 'Samsung', 'phone'),
  ('Galaxy S23 Ultra', 'Samsung', 'phone'),
  ('Galaxy S23+', 'Samsung', 'phone'),
  ('Galaxy S23', 'Samsung', 'phone'),
  ('Galaxy A55', 'Samsung', 'phone'),
  ('Galaxy A54', 'Samsung', 'phone'),
  ('Galaxy A35', 'Samsung', 'phone'),
  ('Galaxy A34', 'Samsung', 'phone'),
  ('Galaxy A25', 'Samsung', 'phone'),
  ('Galaxy A15', 'Samsung', 'phone'),
  ('Galaxy M55', 'Samsung', 'phone'),
  ('Galaxy M35', 'Samsung', 'phone'),
  ('Galaxy Z Fold5', 'Samsung', 'phone'),
  ('Galaxy Z Flip5', 'Samsung', 'phone'),
  ('Galaxy Note 20 Ultra', 'Samsung', 'phone'),
  ('Galaxy Note 20', 'Samsung', 'phone'),
  ('Galaxy Tab S9 Ultra', 'Samsung', 'tablet'),
  ('Galaxy Tab S9+', 'Samsung', 'tablet'),
  ('Galaxy Tab S9', 'Samsung', 'tablet'),
  ('Galaxy Tab A9+', 'Samsung', 'tablet'),
  ('Galaxy Watch6 Classic', 'Samsung', 'watch'),
  ('Galaxy Watch6', 'Samsung', 'watch'),
  ('Galaxy Buds2 Pro', 'Samsung', 'accessory'),
  ('Galaxy Buds2', 'Samsung', 'accessory');

-- Insert sample accessories inventory
INSERT OR IGNORE INTO accessories (part_name, part_number, compatible_devices, category, wholesale_price, retail_price, stock_quantity) VALUES 
  ('Original Samsung 25W Fast Charger', 'EP-TA800NWEGWW', 'Galaxy S24,Galaxy S23,Galaxy A54,Galaxy A34', 'charger', 800, 1200, 50),
  ('Samsung USB-C Cable', 'EP-DG977BWEGWW', 'Galaxy S24,Galaxy S23,Galaxy A54', 'cable', 300, 500, 100),
  ('Galaxy S24 Ultra Screen Protector', 'GP-FPG998KDATW', 'Galaxy S24 Ultra', 'protection', 200, 400, 25),
  ('Galaxy S24 Back Cover', 'EF-PG991TBEGWW', 'Galaxy S24', 'case', 500, 800, 30),
  ('Galaxy S23 Display Assembly', 'GH82-30864A', 'Galaxy S23', 'screen', 8000, 12000, 5),
  ('Galaxy A54 Battery', 'EB-BA546ABY', 'Galaxy A54', 'battery', 1200, 1800, 15),
  ('Samsung Galaxy Buds2 Pro', 'SM-R510NZAAINS', 'All Galaxy devices', 'accessory', 12000, 15000, 10),
  ('Wireless Charger Pad', 'EP-P1100BWEGWW', 'Galaxy S24,Galaxy S23,Galaxy Note 20', 'charger', 1500, 2200, 20);

-- Insert sample customer data
INSERT OR IGNORE INTO customers (phone_number, name, email, address) VALUES 
  ('9876543210', 'Rajesh Kumar', 'rajesh@example.com', 'Civil Line, Bijnor'),
  ('9876543211', 'Priya Sharma', 'priya@example.com', 'Nazibabad Road, Bijnor'),
  ('9876543212', 'Amit Singh', 'amit@example.com', 'Station Road, Bijnor');

-- Insert sample enquiries
INSERT OR IGNORE INTO enquiries (ticket_number, customer_id, imei, device_model, problem_description, warranty_status, service_type, status) VALUES 
  ('BS2025001', 1, '123456789012345', 'Galaxy S24', 'Screen cracked after drop', 'out_of_warranty', 'repair', 'open'),
  ('BS2025002', 2, '123456789012346', 'Galaxy A54', 'Battery draining fast', 'in_warranty', 'repair', 'in_progress'),
  ('BS2025003', 3, '123456789012347', 'Galaxy S23', 'Water damage claim', 'in_warranty', 'claim', 'open');