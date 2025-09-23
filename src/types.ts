export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: number;
  phone_number: string;
  name?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Enquiry {
  id: number;
  ticket_number: string;
  customer_id?: number;
  imei?: string;
  device_model: string;
  problem_description: string;
  warranty_status?: 'in_warranty' | 'out_of_warranty' | 'unknown';
  insurance_status?: 'bajaj_allianz' | 'other' | 'none';
  service_type: 'repair' | 'claim' | 'enquiry';
  status: 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: number;
  source: 'web' | 'whatsapp' | 'facebook' | 'phone' | 'walk_in';
  pickup_required: boolean;
  drop_required: boolean;
  estimated_completion?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  assigned_user?: User;
}

export interface Accessory {
  id: number;
  part_name: string;
  part_number?: string;
  compatible_devices?: string;
  category?: string;
  wholesale_price?: number;
  retail_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  supplier?: string;
  is_active: boolean;
  created_at: string;
}

export interface Communication {
  id: number;
  enquiry_id: number;
  communication_type: 'call' | 'whatsapp' | 'email' | 'sms' | 'visit' | 'note';
  direction?: 'incoming' | 'outgoing' | 'internal';
  content: string;
  created_by?: number;
  created_at: string;
  user?: User;
}

export interface StatusHistory {
  id: number;
  enquiry_id: number;
  old_status?: string;
  new_status: string;
  notes?: string;
  changed_by?: number;
  changed_at: string;
  user?: User;
}

export interface EnquiryFormData {
  customer_name: string;
  phone_number: string;
  email?: string;
  device_model: string;
  imei?: string;
  problem_description: string;
  warranty_status?: string;
  insurance_status?: string;
  service_type: string;
}

export type Bindings = {
  DB: D1Database;
}