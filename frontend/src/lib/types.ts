export interface User {
  id: number;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  phone_number?: string;
  business_name?: string;
  business_type?: string;
  address?: string;
  is_staff: boolean;
  is_active: boolean;
  is_customer: boolean;
  is_admin: boolean;
  date_joined: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  profile?: {
    company_name?: string;
    contact_person?: string;
    phone_number?: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    [key: string]: string | undefined;
  };
}

export interface Business {
  id: number;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  business_type: string;
  address: string;
  platform: 'mobile' | 'desktop' | 'both';
  current_plan: string;
  subscription_status: string;
  trial_status: string;
  expiry_date: string | null;
  registration_date: string;
  is_active: boolean;
  notes?: string;
}

export interface LicensePlan {
  id: number;
  name: string;
  code?: string;
  description: string;
  price: number;
  duration_months: number;
  duration_days?: number;
  device_limit: number;
  max_activations?: number;
  features: string[] | Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

export interface License {
  id: number;
  license_key: string;
  plan: number | LicensePlan;
  customer: number | User;
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'trial' | 'pending' | 'cancelled';
  start_date: string;
  expiry_date: string;
  device_limit: number;
  activated_devices?: number;
  max_activations?: number;
  notes: string;
  is_trial: boolean;
  is_lifetime?: boolean;
  platform?: string;
  issued_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  customer: number | User;
  license?: number | License;
  plan: number | LicensePlan;
  plan_selected?: string;
  submission_date?: string;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_image?: string;
  admin_notes?: string;
  rejection_reason?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  currency?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer: number | User;
  payment?: number;
  license?: number;
  amount: number;
  tax?: number;
  total?: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  due_date: string;
  paid_at?: string;
  issued_date?: string;
  items?: InvoiceItem[];
  created_at: string;
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
  recipient?: number | User;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
}

export interface CustomerProfile {
  id: number;
  user: number;
  company_name: string;
  tin_number?: string;
  city?: string;
  region?: string;
  country?: string;
  contact_person?: string;
  phone_number?: string;
  address?: string;
  tax_id?: string;
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  created_at: string;
  updated_at: string;
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
  totalBusinesses?: number;
  activeBusinesses?: number;
  trialUsers?: number;
  activeSubscriptions?: number;
  expiredSubscriptions?: number;
  basicSubscribers?: number;
  premiumSubscribers?: number;
  monthlyRevenue?: number;
  todayRevenue?: number;
  renewalsThisMonth?: number;
  newBusinessesToday?: number;
  pendingPayments?: number;
  revenueTrend?: { date: string; amount: number }[];
  subscriptionGrowth?: { date: string; count: number }[];
  trialConversionRate?: number;
  mobileVsDesktop?: { mobile: number; desktop: number };
  subscriptionDistribution?: { basic: number; premium: number };
  expiringSoon?: License[];
  recentActivity?: Record<string, unknown>[];
}

export interface RevenueDataPoint {
  date: string;
  amount: number;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'json' | 'email' | 'phone';
  description: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: number;
  name: string;
  code: string;
  enabled: boolean;
  is_beta: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  id: number;
  platform: 'mobile' | 'desktop';
  version: string;
  min_version: string;
  is_force_update: boolean;
  release_notes: string;
  download_url: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  business: number | Business;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: number | User;
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface SupportReply {
  id: number;
  ticket: number;
  admin?: number;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin: number | User;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  before_state: unknown;
  after_state: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminSession {
  id: number;
  admin: number;
  ip_address: string;
  user_agent?: string;
  login_time: string;
  logout_time?: string;
  is_active: boolean;
}

export interface RevenueReport {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
  byPlatform: { platform: string; total: number }[];
  byPlan: { plan: string; total: number }[];
  byMethod: { method: string; total: number }[];
  renewalRevenue: number;
  growth: { date: string; amount: number }[];
}

export interface AnalyticsData {
  mostActiveBusinesses: Record<string, unknown>[];
  averageSessionTime: number;
  mostUsedFeatures: { feature: string; count: number }[];
  premiumFeatureUsage: { feature: string; count: number }[];
  upgradeRate: number;
  downgradeRate: number;
  retentionRate: number;
  churnRate: number;
  averageRevenuePerUser: number;
  monthlyRecurringRevenue: number;
  customerLifetimeValue: number;
  trialConversionRate: number;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface Subscription {
  id: number;
  business_id: number;
  business_name: string;
  license_key: string;
  platform: 'mobile' | 'desktop';
  plan: 'Basic' | 'Premium';
  billing: 'Monthly' | 'Quarterly' | 'Annual';
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'pending';
  start_date: string;
  expiry_date: string;
  notes?: string;
  auto_renew: boolean;
}

export interface Trial {
  id: number;
  business_id: number;
  business_name: string;
  owner_name: string;
  phone: string;
  platform: 'mobile' | 'desktop';
  trial_start_date: string;
  trial_end_date: string;
  days_remaining: number;
  status: 'active' | 'expired' | 'converted';
}

export interface PaymentVerification extends Payment {
  receipt_image?: string;
  plan_selected?: string;
  submission_date?: string;
  admin_notes?: string;
  customer_full_name?: string;
  customer_phone?: string;
}

export interface RevenueMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
  growth_chart: { date: string; amount: number }[];
  subscription_chart: { date: string; amount: number }[];
  premium_conversion: { stage: string; count: number }[];
  by_platform: { platform: string; amount: number }[];
  by_plan: { plan: string; amount: number }[];
  by_payment_method: { method: string; amount: number }[];
  renewal_revenue: { period: string; amount: number }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
