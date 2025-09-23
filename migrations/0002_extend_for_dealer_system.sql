-- Extension to existing database for Bijnor Services Dealer System
-- Adds dealer management functionality to existing CRM

-- Add phone column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN phone TEXT;

-- Change role column to user_type with proper constraints (if needed)
-- Note: SQLite doesn't support changing column constraints directly, so we'll work with existing 'role'

-- Dealer levels and management
CREATE TABLE IF NOT EXISTS dealer_levels (
  id INTEGER PRIMARY KEY,
  level_name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  benefit_per_referral DECIMAL(10,2) DEFAULT 0,
  description TEXT
);

-- Insert default dealer levels
INSERT OR IGNORE INTO dealer_levels (id, level_name, min_points, benefit_per_referral, description) VALUES
(1, 'Level 1', 0, 0, 'Entry level dealer'),
(2, 'Level 2', 50, 0, 'Regular dealer'),
(3, 'Level 3', 150, 50.00, 'Premium dealer - ₹50 per referral'),
(4, 'Level 4', 300, 100.00, 'Elite dealer - ₹100 per referral');

-- Dealer profiles (extended info for dealer users)
CREATE TABLE IF NOT EXISTS dealer_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  dealer_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  total_enquiries INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  out_of_warranty_ratio DECIMAL(5,2) DEFAULT 0.0,
  last_activity DATETIME,
  benefits_earned DECIMAL(10,2) DEFAULT 0,
  benefits_paid DECIMAL(10,2) DEFAULT 0,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dealer_level) REFERENCES dealer_levels(id)
);

-- Add location fields to customers table if they don't exist
ALTER TABLE customers ADD COLUMN location_lat DECIMAL(10,8);
ALTER TABLE customers ADD COLUMN location_lng DECIMAL(11,8);
ALTER TABLE customers ADD COLUMN location_method TEXT CHECK (location_method IN ('gps', 'manual', 'auto'));

-- Add location fields to enquiries table if they don't exist
ALTER TABLE enquiries ADD COLUMN customer_location_lat DECIMAL(10,8);
ALTER TABLE enquiries ADD COLUMN customer_location_lng DECIMAL(11,8);
ALTER TABLE enquiries ADD COLUMN location_method TEXT CHECK (location_method IN ('gps', 'manual', 'auto'));
ALTER TABLE enquiries ADD COLUMN is_referred_by_dealer BOOLEAN DEFAULT FALSE;
ALTER TABLE enquiries ADD COLUMN dealer_referral_id INTEGER REFERENCES users(id);
ALTER TABLE enquiries ADD COLUMN submitted_by_type TEXT CHECK (submitted_by_type IN ('customer', 'dealer', 'partner'));
ALTER TABLE enquiries ADD COLUMN submitted_by_id INTEGER REFERENCES users(id);

-- Samsung devices (for IMEI lookup) - if not exists or extend existing
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imei TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  color TEXT,
  storage TEXT,
  purchase_date DATE,
  warranty_status TEXT CHECK (warranty_status IN ('in_warranty', 'out_of_warranty', 'extended_warranty')),
  warranty_expires DATE,
  customer_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Inventory management
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT DEFAULT 'Samsung',
  model_compatibility TEXT, -- JSON array of compatible models
  quantity_available INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  unit_cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  supplier TEXT,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dealer activities and point tracking
CREATE TABLE IF NOT EXISTS dealer_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('enquiry_submitted', 'customer_referred', 'out_warranty_call')),
  points_earned INTEGER DEFAULT 0,
  related_enquiry_id INTEGER,
  related_customer_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealer_id) REFERENCES users(id),
  FOREIGN KEY (related_enquiry_id) REFERENCES enquiries(id),
  FOREIGN KEY (related_customer_id) REFERENCES customers(id)
);

-- Dealer benefits and payments
CREATE TABLE IF NOT EXISTS dealer_benefits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id INTEGER NOT NULL,
  enquiry_id INTEGER NOT NULL,
  benefit_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date DATE,
  payment_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealer_id) REFERENCES users(id),
  FOREIGN KEY (enquiry_id) REFERENCES enquiries(id)
);

-- System settings and configurations
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('dealer_promotion_threshold_enquiries', '10', 'integer', 'Minimum enquiries for level promotion'),
('dealer_promotion_threshold_referrals', '5', 'integer', 'Minimum referrals for level promotion'),
('dealer_demotion_threshold_ratio', '0.3', 'decimal', 'Minimum out-of-warranty ratio to avoid demotion'),
('dealer_demotion_inactive_days', '90', 'integer', 'Days of inactivity before demotion consideration'),
('service_center_working_hours', '10:00-18:30', 'string', 'Working hours format HH:MM-HH:MM'),
('service_center_working_days', 'Monday-Saturday', 'string', 'Working days');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_user_id ON dealer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_level ON dealer_profiles(dealer_level);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_dealer_referral ON enquiries(dealer_referral_id);
CREATE INDEX IF NOT EXISTS idx_inventory_part_number ON inventory(part_number);
CREATE INDEX IF NOT EXISTS idx_dealer_activities_dealer_id ON dealer_activities(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_benefits_dealer_id ON dealer_benefits(dealer_id);