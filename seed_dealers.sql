-- Seed data for Bijnor Services Dealer System
-- Compatible with existing schema

-- Insert dealer users using existing 'role' column
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, role) VALUES 
('dealer_amit', 'amit@retailer.com', 'dealer123', 'Amit Mobile Shop', '9876543213', 'dealer'),
('dealer_sunita', 'sunita@electronics.com', 'dealer123', 'Sunita Electronics', '9876543214', 'dealer'),
('dealer_vikram', 'vikram@phonestore.com', 'dealer123', 'Vikram Phone Store', '9876543215', 'dealer');

-- Setup dealer profiles for the new dealer users
INSERT OR IGNORE INTO dealer_profiles (user_id, dealer_level, total_points, total_enquiries, total_referrals, address, city, state, pincode) VALUES 
((SELECT id FROM users WHERE username = 'dealer_amit'), 2, 75, 15, 8, 'Main Market Road', 'Bijnor', 'UP', '246701'),
((SELECT id FROM users WHERE username = 'dealer_sunita'), 3, 180, 30, 18, 'Civil Lines', 'Bijnor', 'UP', '246701'),
((SELECT id FROM users WHERE username = 'dealer_vikram'), 1, 25, 5, 2, 'Station Road', 'Bijnor', 'UP', '246701');

-- Insert sample Samsung devices
INSERT OR IGNORE INTO devices (imei, model, variant, color, storage, purchase_date, warranty_status, warranty_expires, customer_id) VALUES 
('860123456789012', 'Galaxy S24', 'S24 Ultra', 'Phantom Black', '256GB', '2024-01-15', 'in_warranty', '2025-01-15', 1),
('860123456789013', 'Galaxy A54', '5G', 'Awesome Blue', '128GB', '2023-08-20', 'in_warranty', '2024-08-20', 2),
('860123456789014', 'Galaxy M34', '5G', 'Midnight Blue', '128GB', '2023-03-10', 'out_of_warranty', '2024-03-10', 1),
('860123456789015', 'Galaxy S23', 'FE', 'Purple', '128GB', '2024-02-25', 'in_warranty', '2025-02-25', 2);

-- Insert sample inventory items
INSERT OR IGNORE INTO inventory (part_number, part_name, category, model_compatibility, quantity_available, minimum_stock, unit_cost, selling_price, supplier, location) VALUES 
('SAM-BAT-S24-001', 'Galaxy S24 Battery', 'Battery', '["Galaxy S24", "Galaxy S24+"]', 15, 5, 2500.00, 3500.00, 'Samsung Official', 'Shelf A1'),
('SAM-SCR-A54-001', 'Galaxy A54 Display Assembly', 'Display', '["Galaxy A54 5G"]', 8, 3, 4500.00, 6500.00, 'Samsung Official', 'Shelf B2'),
('SAM-CHG-001', 'Samsung 25W Charger', 'Charger', '["Galaxy S24", "Galaxy A54", "Galaxy M34"]', 25, 10, 1200.00, 1800.00, 'Samsung Official', 'Shelf C1'),
('SAM-CAM-S23-001', 'Galaxy S23 Rear Camera', 'Camera', '["Galaxy S23", "Galaxy S23 FE"]', 5, 2, 3500.00, 5000.00, 'Samsung Official', 'Shelf B1');

-- Update dealer profiles with activity
UPDATE dealer_profiles SET 
  last_activity = CURRENT_TIMESTAMP,
  benefits_earned = CASE 
    WHEN dealer_level >= 3 THEN total_referrals * (SELECT benefit_per_referral FROM dealer_levels WHERE id = dealer_level)
    ELSE 0 
  END
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'dealer'
);