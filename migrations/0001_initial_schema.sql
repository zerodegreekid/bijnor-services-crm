-- Users table for admin and staff authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' or 'staff'
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  name TEXT,
  email TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Device models for Samsung products
CREATE TABLE IF NOT EXISTS device_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT UNIQUE NOT NULL,
  brand TEXT DEFAULT 'Samsung',
  category TEXT, -- 'phone', 'tablet', 'watch', 'tv', etc.
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enquiries/tickets table
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  imei TEXT,
  device_model TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  warranty_status TEXT, -- 'in_warranty', 'out_of_warranty', 'unknown'
  insurance_status TEXT, -- 'bajaj_allianz', 'other', 'none'
  service_type TEXT NOT NULL, -- 'repair', 'claim', 'enquiry'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_parts', 'completed', 'cancelled'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to INTEGER,
  source TEXT DEFAULT 'web', -- 'web', 'whatsapp', 'facebook', 'phone', 'walk_in'
  pickup_required BOOLEAN DEFAULT 0,
  drop_required BOOLEAN DEFAULT 1,
  estimated_completion DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Accessories and parts inventory
CREATE TABLE IF NOT EXISTS accessories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_name TEXT NOT NULL,
  part_number TEXT UNIQUE,
  compatible_devices TEXT, -- JSON array or comma-separated
  category TEXT, -- 'charger', 'case', 'screen', 'battery', etc.
  wholesale_price REAL,
  retail_price REAL NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  supplier TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Communication logs for tracking customer interactions
CREATE TABLE IF NOT EXISTS communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id INTEGER NOT NULL,
  communication_type TEXT NOT NULL, -- 'call', 'whatsapp', 'email', 'sms', 'visit', 'note'
  direction TEXT, -- 'incoming', 'outgoing', 'internal'
  content TEXT NOT NULL,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enquiry_id) REFERENCES enquiries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Audit trail for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  changed_by INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Status history for enquiries
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_by INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enquiry_id) REFERENCES enquiries(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Sessions for user authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enquiries_imei ON enquiries(imei);
CREATE INDEX IF NOT EXISTS idx_enquiries_ticket_number ON enquiries(ticket_number);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_customer_id ON enquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_communications_enquiry_id ON communications(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_accessories_part_number ON accessories(part_number);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_enquiry_id ON status_history(enquiry_id);