-- Comprehensive Claims Processing System for Bijnor Services
-- Samsung Service Center + Bajaj Allianz Insurance Claims

-- Extend users table for partner types
ALTER TABLE users ADD COLUMN partner_type TEXT CHECK (partner_type IN ('samsung', 'bajaj_allianz', 'admin', 'super_admin', 'dealer')) DEFAULT 'samsung';

-- Device brands and warranty verification URLs
CREATE TABLE IF NOT EXISTS device_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL UNIQUE,
  warranty_check_url TEXT,
  sim_activation_url TEXT,
  icloud_status_url TEXT,
  verification_method TEXT DEFAULT 'url',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert device brands with verification URLs
INSERT OR IGNORE INTO device_brands (brand_name, warranty_check_url, sim_activation_url, verification_method) VALUES
('Apple', 'https://india.moli.lenovo.com/callcenterv2/moli?data=eyJmaXJzdE5hbWUiOiJtYWhlbmRyYSIsImVtYWlsIjoiVG9tZXJtYWhlbmRyYTA3QGdtYWlsLmNvbSIsInBob25lTnVtYmVyIjoiNzM3OTEzMTExMSIsImxhbmd1YWdlIjoiRW5nbGlzaCJ9', 'https://iunlocker.com/check_icloud.php', 'url'),
('Motorola', 'https://india.moli.lenovo.com/callcenterv2/moli?data=eyJmaXJzdE5hbWUiOiJtYWhlbmRyYSIsImVtYWlsIjoiVG9tZXJtYWhlbmRyYTA3QGdtYWlsLmNvbSIsInBob25lTnVtYmVyIjoiNzM3OTEzMTExMSIsImxhbmd1YWdlIjoiRW5nbGlzaCJ9', NULL, 'url'),
('OnePlus', 'https://service.oneplus.com/uk/warranty-check', 'https://iunlocker.com/check_imei/oneplus/', 'url'),
('Oppo', 'https://support.oppo.com/in/warranty-check/', NULL, 'url'),
('Realme', 'https://www.realme.com/in/support/phonecheck', NULL, 'url'),
('Samsung', 'https://account.samsung.com/accounts/v1/CyberService/signInGate?response_type=code&client_id=661924lxg8&locale=en_IN&countryCode=IN&redirect_uri=https:%2F%2Fwww.samsung.com%2Fin%2Fsupport%2Fyour-service%2FidenCallback&state=95e2b59c2575411baa847163695243ac&goBackURL=https:%2F%2Fwww.samsung.com%2Fin%2Fsupport%2Fyour-service%2FidenCallback&scope=&redirect_menu=main', NULL, 'url'),
('Tecno', 'https://www.carlcare.in/in/warranty-check/', NULL, 'url'),
('Infinix', 'https://www.carlcare.in/in/warranty-check/', NULL, 'url'),
('iTel', 'https://www.carlcare.in/in/warranty-check/', NULL, 'url'),
('Vivo', 'https://www.vivo.com/in/support/IMEI', NULL, 'url'),
('Xiaomi', 'https://xiaomicheck.com/', NULL, 'url'),
('Nothing', 'https://in.nothing.tech/pages/imei-result', NULL, 'url');

-- Insurance claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  imei TEXT NOT NULL,
  policy_number TEXT,
  
  -- Claim details
  claim_type TEXT CHECK (claim_type IN ('damage', 'theft', 'liquid_damage', 'screen_break', 'other')) NOT NULL,
  damage_description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  
  -- Service options
  service_type TEXT CHECK (service_type IN ('pickup_drop', 'reimbursement')) NOT NULL,
  pickup_address TEXT,
  drop_address TEXT,
  
  -- Claim lifecycle status
  status TEXT CHECK (status IN (
    'registered', 'verification_pending', 'verification_complete', 
    'assigned', 'pickup_scheduled', 'device_collected', 
    'assessment_in_progress', 'repair_approved', 'repair_in_progress', 
    'repair_complete', 'drop_scheduled', 'delivered', 
    'documentation_pending', 'reimbursement_processing', 
    'settlement_complete', 'claim_rejected', 'claim_closed'
  )) DEFAULT 'registered',
  
  -- Partner assignment
  assigned_partner_id INTEGER,
  assigned_at DATETIME,
  
  -- Warranty verification
  warranty_status TEXT CHECK (warranty_status IN ('in_warranty', 'out_warranty', 'verification_pending', 'verification_failed')),
  warranty_verified_at DATETIME,
  warranty_verification_method TEXT,
  warranty_verification_notes TEXT,
  
  -- Financial details
  estimated_cost DECIMAL(10,2),
  approved_amount DECIMAL(10,2),
  settled_amount DECIMAL(10,2),
  
  -- Pickup/Drop tracking
  pickup_scheduled_date DATETIME,
  pickup_completed_date DATETIME,
  drop_scheduled_date DATETIME,
  drop_completed_date DATETIME,
  
  -- Location tracking
  customer_location_lat DECIMAL(10,8),
  customer_location_lng DECIMAL(11,8),
  
  -- Meta data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (assigned_partner_id) REFERENCES users(id)
);

-- Claim documents and photos
CREATE TABLE IF NOT EXISTS claim_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  document_type TEXT CHECK (document_type IN (
    'damage_photo', 'purchase_receipt', 'id_proof', 'repair_invoice', 
    'warranty_certificate', 'police_report', 'other'
  )) NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Claim activity timeline
CREATE TABLE IF NOT EXISTS claim_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  activity_type TEXT CHECK (activity_type IN (
    'claim_registered', 'warranty_verified', 'partner_assigned', 
    'pickup_scheduled', 'device_collected', 'assessment_complete',
    'repair_started', 'repair_complete', 'drop_scheduled', 
    'device_delivered', 'document_uploaded', 'status_updated',
    'note_added', 'reimbursement_processed', 'claim_settled'
  )) NOT NULL,
  description TEXT NOT NULL,
  performed_by INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Communication log for claims
CREATE TABLE IF NOT EXISTS claim_communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  communication_type TEXT CHECK (communication_type IN (
    'call', 'whatsapp', 'sms', 'email', 'facebook', 'internal_note'
  )) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  message TEXT NOT NULL,
  staff_member_id INTEGER,
  customer_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id),
  FOREIGN KEY (staff_member_id) REFERENCES users(id)
);

-- Reimbursement requests (for external repairs)
CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL UNIQUE,
  service_center_name TEXT NOT NULL,
  service_center_address TEXT NOT NULL,
  repair_invoice_number TEXT NOT NULL,
  repair_date DATE NOT NULL,
  repair_cost DECIMAL(10,2) NOT NULL,
  
  -- Required documents
  invoice_document_id INTEGER,
  warranty_proof_id INTEGER,
  
  -- Processing status
  status TEXT CHECK (status IN (
    'submitted', 'under_review', 'approved', 'rejected', 'payment_processed'
  )) DEFAULT 'submitted',
  
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  review_notes TEXT,
  
  approved_amount DECIMAL(10,2),
  payment_date DATE,
  payment_reference TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (claim_id) REFERENCES insurance_claims(id),
  FOREIGN KEY (invoice_document_id) REFERENCES claim_documents(id),
  FOREIGN KEY (warranty_proof_id) REFERENCES claim_documents(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Multi-channel contact information
CREATE TABLE IF NOT EXISTS contact_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_type TEXT CHECK (channel_type IN (
    'whatsapp', 'facebook', 'website', 'google_reviews', 'location', 'samsung_portal'
  )) NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert contact channels
INSERT OR IGNORE INTO contact_channels (channel_type, channel_name, channel_url, display_order) VALUES
('facebook', 'Facebook Page', 'https://www.facebook.com/bijnorservices', 1),
('website', 'Official Website', 'http://www.bijnorservices.in/', 2),
('whatsapp', 'WhatsApp Support', 'https://wa.me/918006999806', 3),
('whatsapp', 'WhatsApp Business', 'https://wa.me/message/ZZ7O4VI3C64NA', 4),
('google_reviews', 'Google Reviews', 'https://g.page/r/CTiSXfQxuNOZEBM/review', 5),
('location', 'Location Map', 'https://maps.app.goo.gl/Q8jusQuafzFFhJ278', 6),
('samsung_portal', 'Samsung Service Portal', 'https://servicecenter.samsungdigitalservicecenter.com/authorised-samsung-service-center-bijnor-services-mobile-phone-repair-service-civil-line-bijnor-236981/Home', 7);

-- Enhanced system settings for claims processing
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('default_pickup_time_hours', '48', 'integer', 'Default hours for pickup scheduling'),
('max_reimbursement_amount', '25000', 'decimal', 'Maximum reimbursement amount without approval'),
('warranty_verification_required', 'true', 'boolean', 'Require warranty verification for all claims'),
('auto_assign_claims', 'false', 'boolean', 'Automatically assign claims to partners'),
('claim_documentation_mandatory', 'true', 'boolean', 'Require mandatory documentation for claims'),
('partner_performance_threshold', '90', 'decimal', 'Partner performance threshold percentage'),
('claim_processing_sla_hours', '72', 'integer', 'SLA for claim processing in hours');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_partner ON insurance_claims(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_customer ON insurance_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_brand ON insurance_claims(device_brand);
CREATE INDEX IF NOT EXISTS idx_claim_activities_claim_id ON claim_activities(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_communications_claim_id ON claim_communications(claim_id);
CREATE INDEX IF NOT EXISTS idx_device_brands_name ON device_brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_users_partner_type ON users(partner_type);

-- Update existing users to have partner types
UPDATE users SET partner_type = 'samsung' WHERE role IN ('staff', 'admin');
UPDATE users SET partner_type = 'admin' WHERE role = 'admin';
UPDATE users SET partner_type = 'dealer' WHERE role = 'dealer';