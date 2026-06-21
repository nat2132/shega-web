export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  profile?: CustomerProfile;
}

export interface LicensePlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price: number;
  duration_days: number;
  max_activations: number;
  is_active: boolean;
  features: Record<string, boolean>;
}

export interface License {
  id: number;
  license_key: string;
  plan: LicensePlan;
  customer: User;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  activated_devices: number;
  max_activations: number;
  issued_date: string;
  expiry_date: string;
  is_lifetime: boolean;
  notes: string;
}

export interface DeviceActivation {
  id: number;
  license: number;
  device_id: string;
  device_name: string;
  hardware_id: string;
  ip_address: string;
  is_active: boolean;
  activated_at: string;
  last_seen: string;
}

export interface Payment {
  id: number;
  customer: User;
  license: License;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string;
  status: 'pending' | 'approved' | 'rejected';
  paid_at: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer: User;
  license: License;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issued_date: string;
  due_date: string;
  paid_at: string | null;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Notification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface CustomerProfile {
  id: number;
  company_name: string;
  contact_person: string;
  phone_number: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
}

export interface DashboardMetrics {
  total_customers: number;
  active_licenses: number;
  pending_payments: number;
  monthly_revenue: number;
  total_revenue: number;
  expiring_soon: number;
  recent_registrations: number;
  revenue_chart: RevenueDataPoint[];
  license_status_distribution: Record<string, number>;
}

export interface RevenueDataPoint {
  date: string;
  amount: number;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
