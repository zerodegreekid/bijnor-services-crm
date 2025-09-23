-- Seed data for Claims Processing System

-- Add Bajaj Allianz partners
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, role, partner_type) VALUES 
('bajaj_partner_1', 'claims1@bijnorservices.com', 'claims123', 'Ravi Kumar Claims', '9876543216', 'staff', 'bajaj_allianz'),
('bajaj_partner_2', 'claims2@bijnorservices.com', 'claims123', 'Deepika Claims', '9876543217', 'staff', 'bajaj_allianz'),
('super_admin', 'admin@bijnorservices.com', 'admin123', 'Super Admin', '9876543218', 'admin', 'super_admin');

-- Update existing users partner types
UPDATE users SET partner_type = 'samsung' WHERE username IN ('raj_technician', 'priya_manager');

-- Insert sample insurance claims
INSERT OR IGNORE INTO insurance_claims (
  claim_number, customer_id, device_brand, device_model, imei, policy_number,
  claim_type, damage_description, incident_date, service_type, 
  pickup_address, status, customer_location_lat, customer_location_lng,
  estimated_cost
) VALUES 
('BA2025001', 1, 'Samsung', 'Galaxy S24', '860123456789012', 'BA123456789',
 'screen_break', 'Screen cracked after accidental drop', '2025-09-20', 'pickup_drop',
 'Sector 12, Block A, Bijnor', 'registered', 29.3737, 78.1335, 15000.00),

('BA2025002', 2, 'Apple', 'iPhone 14', '860123456789013', 'BA123456790', 
 'liquid_damage', 'Water damage from rain exposure', '2025-09-21', 'reimbursement',
 'Civil Lines Area, Bijnor', 'verification_pending', 29.3745, 78.1340, 25000.00),

('BA2025003', 1, 'OnePlus', 'OnePlus 11', '860123456789014', 'BA123456791',
 'damage', 'Back panel cracked and camera damaged', '2025-09-22', 'pickup_drop',
 'Old City Market, Bijnor', 'assigned', 29.3720, 78.1325, 18000.00);

-- Update claims with partner assignments
UPDATE insurance_claims 
SET assigned_partner_id = (SELECT id FROM users WHERE username = 'bajaj_partner_1' LIMIT 1),
    assigned_at = CURRENT_TIMESTAMP
WHERE claim_number IN ('BA2025001', 'BA2025003');

UPDATE insurance_claims 
SET assigned_partner_id = (SELECT id FROM users WHERE username = 'bajaj_partner_2' LIMIT 1),
    assigned_at = CURRENT_TIMESTAMP
WHERE claim_number = 'BA2025002';

-- Insert claim activities
INSERT OR IGNORE INTO claim_activities (
  claim_id, activity_type, description, performed_by, new_status
) VALUES 
(1, 'claim_registered', 'Initial claim registration completed', 1, 'registered'),
(2, 'claim_registered', 'Claim registered for water damage assessment', 1, 'registered'),
(3, 'claim_registered', 'Multi-damage claim registered', 1, 'registered'),
(1, 'partner_assigned', 'Assigned to Ravi Kumar for processing', 1, 'assigned'),
(3, 'partner_assigned', 'Assigned to Ravi Kumar for processing', 1, 'assigned');

-- Insert sample claim communications
INSERT OR IGNORE INTO claim_communications (
  claim_id, communication_type, direction, message, staff_member_id
) VALUES 
(1, 'whatsapp', 'outbound', 'Hello, your claim BA2025001 has been registered. We will contact you within 48 hours for pickup.', 
 (SELECT id FROM users WHERE username = 'bajaj_partner_1' LIMIT 1)),

(2, 'call', 'inbound', 'Customer called to check status of water damage claim', 
 (SELECT id FROM users WHERE username = 'bajaj_partner_2' LIMIT 1)),

(3, 'whatsapp', 'outbound', 'Your OnePlus device claim BA2025003 is assigned. Pickup scheduled for tomorrow.', 
 (SELECT id FROM users WHERE username = 'bajaj_partner_1' LIMIT 1));

-- Insert sample reimbursement request
INSERT OR IGNORE INTO reimbursement_requests (
  claim_id, service_center_name, service_center_address, 
  repair_invoice_number, repair_date, repair_cost, status
) VALUES 
(2, 'Apple Authorized Service Center Delhi', 'Connaught Place, New Delhi', 
 'ASC2025001', '2025-09-22', 22000.00, 'submitted');