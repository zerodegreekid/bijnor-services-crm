-- Seed data for Bijnor Services CRM Portal
-- Test data for development and demonstration

-- Insert admin user (password: admin123)
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, user_type) VALUES 
('admin', 'admin@bijnorservices.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Admin User', '9876543210', 'admin');

-- Insert partner/staff users (password: partner123)
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, user_type) VALUES 
('raj_technician', 'raj@bijnorservices.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Raj Kumar', '9876543211', 'partner'),
('priya_manager', 'priya@bijnorservices.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Priya Sharma', '9876543212', 'partner');

-- Insert dealer users (password: dealer123)
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, user_type) VALUES 
('dealer_amit', 'amit@retailer.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Amit Mobile Shop', '9876543213', 'dealer'),
('dealer_sunita', 'sunita@electronics.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Sunita Electronics', '9876543214', 'dealer'),
('dealer_vikram', 'vikram@phonestore.com', '$2a$10$rXKoqLNeHJ8xWqC1O.z8N.HNlD4.Kz4YtQG9/BV.P4/X8hNwXiXy2', 'Vikram Phone Store', '9876543215', 'dealer');

-- Setup dealer profiles
INSERT OR IGNORE INTO dealer_profiles (user_id, dealer_level, total_points, total_enquiries, total_referrals, address, city, state, pincode) VALUES 
(4, 2, 75, 15, 8, 'Main Market Road', 'Bijnor', 'UP', '246701'),
(5, 3, 180, 30, 18, 'Civil Lines', 'Bijnor', 'UP', '246701'),
(6, 1, 25, 5, 2, 'Station Road', 'Bijnor', 'UP', '246701');

-- Insert sample customers
INSERT OR IGNORE INTO customers (name, email, phone, address, city, state, pincode, location_lat, location_lng, location_method) VALUES 
('Rohit Gupta', 'rohit@gmail.com', '9876543220', 'Sector 12, Block A', 'Bijnor', 'UP', '246701', 29.3737, 78.1335, 'gps'),
('Neha Singh', 'neha@yahoo.com', '9876543221', 'Civil Lines Area', 'Bijnor', 'UP', '246701', 29.3745, 78.1340, 'manual'),
('Arjun Verma', 'arjun@gmail.com', '9876543222', 'Old City Market', 'Bijnor', 'UP', '246701', 29.3720, 78.1325, 'gps'),
('Kavya Sharma', 'kavya@outlook.com', '9876543223', 'University Area', 'Bijnor', 'UP', '246701', 29.3755, 78.1350, 'auto');

-- Insert sample Samsung devices
INSERT OR IGNORE INTO devices (imei, model, variant, color, storage, purchase_date, warranty_status, warranty_expires, customer_id) VALUES 
('860123456789012', 'Galaxy S24', 'S24 Ultra', 'Phantom Black', '256GB', '2024-01-15', 'in_warranty', '2025-01-15', 1),
('860123456789013', 'Galaxy A54', '5G', 'Awesome Blue', '128GB', '2023-08-20', 'in_warranty', '2024-08-20', 2),
('860123456789014', 'Galaxy M34', '5G', 'Midnight Blue', '128GB', '2023-03-10', 'out_of_warranty', '2024-03-10', 3),
('860123456789015', 'Galaxy S23', 'FE', 'Purple', '128GB', '2024-02-25', 'in_warranty', '2025-02-25', 4);

-- Insert sample enquiries
INSERT OR IGNORE INTO enquiries (ticket_number, customer_id, device_id, submitted_by_type, submitted_by_id, issue_category, issue_description, priority, status, customer_location_lat, customer_location_lng, location_method, is_referred_by_dealer, dealer_referral_id) VALUES 
('BSC240001', 1, 1, 'dealer', 4, 'Display Issue', 'Screen flickering problem', 'high', 'new', 29.3737, 78.1335, 'gps', TRUE, 4),
('BSC240002', 2, 2, 'customer', 2, 'Battery Issue', 'Battery draining fast', 'medium', 'assigned', 29.3745, 78.1340, 'manual', FALSE, NULL),
('BSC240003', 3, 3, 'dealer', 5, 'Software Issue', 'Phone hanging frequently', 'medium', 'in_progress', 29.3720, 78.1325, 'gps', TRUE, 5),
('BSC240004', 4, 4, 'customer', 4, 'Camera Issue', 'Camera not focusing properly', 'low', 'new', 29.3755, 78.1350, 'auto', FALSE, NULL);

-- Insert sample inventory items
INSERT OR IGNORE INTO inventory (part_number, part_name, category, model_compatibility, quantity_available, minimum_stock, unit_cost, selling_price, supplier, location) VALUES 
('SAM-BAT-S24-001', 'Galaxy S24 Battery', 'Battery', '["Galaxy S24", "Galaxy S24+"]', 15, 5, 2500.00, 3500.00, 'Samsung Official', 'Shelf A1'),
('SAM-SCR-A54-001', 'Galaxy A54 Display Assembly', 'Display', '["Galaxy A54 5G"]', 8, 3, 4500.00, 6500.00, 'Samsung Official', 'Shelf B2'),
('SAM-CHG-001', 'Samsung 25W Charger', 'Charger', '["Galaxy S24", "Galaxy A54", "Galaxy M34"]', 25, 10, 1200.00, 1800.00, 'Samsung Official', 'Shelf C1'),
('SAM-CAM-S23-001', 'Galaxy S23 Rear Camera', 'Camera', '["Galaxy S23", "Galaxy S23 FE"]', 5, 2, 3500.00, 5000.00, 'Samsung Official', 'Shelf B1');

-- Insert dealer activities for points tracking
INSERT OR IGNORE INTO dealer_activities (dealer_id, activity_type, points_earned, related_enquiry_id, related_customer_id, description) VALUES 
(4, 'customer_referred', 10, 1, 1, 'Referred customer with display issue'),
(5, 'customer_referred', 10, 3, 3, 'Referred customer with software issue'),
(4, 'enquiry_submitted', 5, 1, 1, 'Submitted enquiry for customer'),
(5, 'enquiry_submitted', 5, 3, 3, 'Submitted enquiry for customer'),
(6, 'enquiry_submitted', 5, NULL, 2, 'Submitted general enquiry');

-- Insert dealer benefits (Level 3+ dealers get benefits)
INSERT OR IGNORE INTO dealer_benefits (dealer_id, enquiry_id, benefit_amount, payment_status) VALUES 
(5, 3, 50.00, 'pending'); -- Sunita Electronics is Level 3, gets ₹50 per referral

-- Update dealer profiles with activity
UPDATE dealer_profiles SET 
  last_activity = CURRENT_TIMESTAMP,
  benefits_earned = (SELECT COALESCE(SUM(benefit_amount), 0) FROM dealer_benefits WHERE dealer_id = dealer_profiles.user_id)
WHERE user_id IN (4, 5, 6);