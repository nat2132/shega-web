import { create } from 'zustand';
import api from '@/lib/api';
import type {
  DashboardMetrics, Business, License, Payment, User, LicensePlan,
  SystemSetting, FeatureFlag, AppVersion, SupportTicket, AuditLog,
  Notification, RevenueReport, AnalyticsData
} from '@/lib/types';

interface AdminState {
  metrics: DashboardMetrics | null;
  dashboardLoading: boolean;
  businesses: Business[];
  businessesLoading: boolean;
  totalBusinesses: number;
  subscriptions: License[];
  subscriptionsLoading: boolean;
  totalSubscriptions: number;
  payments: Payment[];
  paymentsLoading: boolean;
  totalPayments: number;
  plans: LicensePlan[];
  plansLoading: boolean;
  settings: SystemSetting[];
  settingsLoading: boolean;
  featureFlags: FeatureFlag[];
  featureFlagsLoading: boolean;
  appVersions: AppVersion[];
  appVersionsLoading: boolean;
  supportTickets: SupportTicket[];
  supportTicketsLoading: boolean;
  auditLogs: AuditLog[];
  auditLogsLoading: boolean;
  adminNotifications: Notification[];
  adminNotificationsLoading: boolean;
  revenue: RevenueReport | null;
  revenueLoading: boolean;
  analytics: AnalyticsData | null;
  analyticsLoading: boolean;
  admins: User[];
  adminsLoading: boolean;
  trials: License[];
  trialsLoading: boolean;

  fetchDashboard: () => Promise<void>;
  fetchBusinesses: (params?: Record<string, unknown>) => Promise<void>;
  fetchSubscriptions: (params?: Record<string, unknown>) => Promise<void>;
  fetchPayments: (params?: Record<string, unknown>) => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchFeatureFlags: () => Promise<void>;
  fetchAppVersions: () => Promise<void>;
  fetchSupportTickets: () => Promise<void>;
  fetchAuditLogs: (params?: Record<string, unknown>) => Promise<void>;
  fetchAdminNotifications: () => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchAdmins: () => Promise<void>;
  fetchTrials: (params?: Record<string, unknown>) => Promise<void>;

  suspendBusiness: (id: number) => Promise<void>;
  activateBusiness: (id: number) => Promise<void>;
  deleteBusiness: (id: number) => Promise<void>;
  resetTrial: (id: number) => Promise<void>;

  approvePayment: (id: number) => Promise<void>;
  rejectPayment: (id: number, reason: string) => Promise<void>;
  requestPaymentInfo: (id: number, message: string) => Promise<void>;

  activateSubscription: (id: number) => Promise<void>;
  extendSubscription: (id: number, days: number) => Promise<void>;
  renewSubscription: (id: number) => Promise<void>;
  upgradeSubscription: (id: number, planId: number) => Promise<void>;
  downgradeSubscription: (id: number, planId: number) => Promise<void>;
  cancelSubscription: (id: number) => Promise<void>;
  expireSubscription: (id: number) => Promise<void>;
  restoreSubscription: (id: number) => Promise<void>;

  extendTrial: (id: number, days: number) => Promise<void>;
  endTrial: (id: number) => Promise<void>;
  convertTrial: (id: number, planId: number) => Promise<void>;

  createAdmin: (data: Record<string, unknown>) => Promise<void>;
  suspendAdmin: (id: number) => Promise<void>;
  resetAdminPassword: (id: number) => Promise<void>;

  saveSettings: (data: SystemSetting[]) => Promise<void>;

  toggleFeatureFlag: (id: number) => Promise<void>;
  createFeatureFlag: (data: Record<string, unknown>) => Promise<void>;

  createAppVersion: (data: Record<string, unknown>) => Promise<void>;
  notifyAppUpdate: (id: number) => Promise<void>;

  replyToTicket: (ticketId: number, message: string, isInternal: boolean) => Promise<void>;
  closeTicket: (ticketId: number) => Promise<void>;
  assignTicket: (ticketId: number, adminId: number) => Promise<void>;
  escalateTicket: (ticketId: number) => Promise<void>;

  sendNotification: (data: Record<string, unknown>) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  metrics: null,
  dashboardLoading: false,
  businesses: [],
  businessesLoading: false,
  totalBusinesses: 0,
  subscriptions: [],
  subscriptionsLoading: false,
  totalSubscriptions: 0,
  payments: [],
  paymentsLoading: false,
  totalPayments: 0,
  plans: [],
  plansLoading: false,
  settings: [],
  settingsLoading: false,
  featureFlags: [],
  featureFlagsLoading: false,
  appVersions: [],
  appVersionsLoading: false,
  supportTickets: [],
  supportTicketsLoading: false,
  auditLogs: [],
  auditLogsLoading: false,
  adminNotifications: [],
  adminNotificationsLoading: false,
  revenue: null,
  revenueLoading: false,
  analytics: null,
  analyticsLoading: false,
  admins: [],
  adminsLoading: false,
  trials: [],
  trialsLoading: false,

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const { data } = await api.get('/admin/dashboard/');
      set({ metrics: data });
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      set({ dashboardLoading: false });
    }
  },

  fetchBusinesses: async (params) => {
    set({ businessesLoading: true });
    try {
      const { data } = await api.get('/admin/businesses/', { params });
      set({ businesses: data.results || data, totalBusinesses: data.count || data.length });
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      set({ businessesLoading: false });
    }
  },

  fetchSubscriptions: async (params) => {
    set({ subscriptionsLoading: true });
    try {
      const { data } = await api.get('/admin/subscriptions/', { params });
      set({ subscriptions: data.results || data, totalSubscriptions: data.count || data.length });
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      set({ subscriptionsLoading: false });
    }
  },

  fetchPayments: async (params) => {
    set({ paymentsLoading: true });
    try {
      const { data } = await api.get('/admin/payments/', { params });
      set({ payments: data.results || data, totalPayments: data.count || data.length });
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      set({ paymentsLoading: false });
    }
  },

  fetchPlans: async () => {
    set({ plansLoading: true });
    try {
      const { data } = await api.get('/licenses/plans/');
      set({ plans: data.results || data });
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      set({ plansLoading: false });
    }
  },

  fetchSettings: async () => {
    set({ settingsLoading: true });
    try {
      const { data } = await api.get('/admin/settings/');
      set({ settings: data.results || data });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      set({ settingsLoading: false });
    }
  },

  fetchFeatureFlags: async () => {
    set({ featureFlagsLoading: true });
    try {
      const { data } = await api.get('/admin/feature-flags/');
      set({ featureFlags: data.results || data });
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
    } finally {
      set({ featureFlagsLoading: false });
    }
  },

  fetchAppVersions: async () => {
    set({ appVersionsLoading: true });
    try {
      const { data } = await api.get('/admin/app-versions/');
      set({ appVersions: data.results || data });
    } catch (err) {
      console.error('Failed to fetch app versions:', err);
    } finally {
      set({ appVersionsLoading: false });
    }
  },

  fetchSupportTickets: async () => {
    set({ supportTicketsLoading: true });
    try {
      const { data } = await api.get('/admin/support-tickets/');
      set({ supportTickets: data.results || data });
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      set({ supportTicketsLoading: false });
    }
  },

  fetchAuditLogs: async (params) => {
    set({ auditLogsLoading: true });
    try {
      const { data } = await api.get('/admin/audit-logs/', { params });
      set({ auditLogs: data.results || data });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      set({ auditLogsLoading: false });
    }
  },

  fetchAdminNotifications: async () => {
    set({ adminNotificationsLoading: true });
    try {
      const { data } = await api.get('/notifications/notifications/');
      set({ adminNotifications: data.results || data });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      set({ adminNotificationsLoading: false });
    }
  },

  fetchRevenue: async () => {
    set({ revenueLoading: true });
    try {
      const { data } = await api.get('/admin/revenue/');
      set({ revenue: data });
    } catch (err) {
      console.error('Failed to fetch revenue:', err);
    } finally {
      set({ revenueLoading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ analyticsLoading: true });
    try {
      const { data } = await api.get('/admin/analytics/overview/');
      set({ analytics: data });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      set({ analyticsLoading: false });
    }
  },

  fetchAdmins: async () => {
    set({ adminsLoading: true });
    try {
      const { data } = await api.get('/admin/admins/');
      set({ admins: data.results || data });
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      set({ adminsLoading: false });
    }
  },

  fetchTrials: async (params) => {
    set({ trialsLoading: true });
    try {
      const { data } = await api.get('/admin/trials/', { params });
      set({ trials: data.results || data });
    } catch (err) {
      console.error('Failed to fetch trials:', err);
    } finally {
      set({ trialsLoading: false });
    }
  },

  suspendBusiness: async (id) => {
    await api.post(`/admin/businesses/${id}/suspend/`);
    get().fetchBusinesses();
  },
  activateBusiness: async (id) => {
    await api.post(`/admin/businesses/${id}/activate/`);
    get().fetchBusinesses();
  },
  deleteBusiness: async (id) => {
    await api.delete(`/admin/businesses/${id}/`);
    get().fetchBusinesses();
  },
  resetTrial: async (id) => {
    await api.post(`/admin/businesses/${id}/reset-trial/`);
    get().fetchBusinesses();
  },

  approvePayment: async (id) => {
    await api.post(`/admin/payments/${id}/approve/`);
    get().fetchPayments();
  },
  rejectPayment: async (id, reason) => {
    await api.post(`/admin/payments/${id}/reject/`, { reason });
    get().fetchPayments();
  },
  requestPaymentInfo: async (id, message) => {
    await api.post(`/admin/payments/${id}/request-info/`, { message });
    get().fetchPayments();
  },

  activateSubscription: async (id) => {
    await api.post(`/admin/subscriptions/${id}/activate/`);
    get().fetchSubscriptions();
  },
  extendSubscription: async (id, days) => {
    await api.post(`/admin/subscriptions/${id}/extend/`, { days });
    get().fetchSubscriptions();
  },
  renewSubscription: async (id) => {
    await api.post(`/admin/subscriptions/${id}/renew/`);
    get().fetchSubscriptions();
  },
  upgradeSubscription: async (id, planId) => {
    await api.post(`/admin/subscriptions/${id}/upgrade/`, { plan_id: planId });
    get().fetchSubscriptions();
  },
  downgradeSubscription: async (id, planId) => {
    await api.post(`/admin/subscriptions/${id}/downgrade/`, { plan_id: planId });
    get().fetchSubscriptions();
  },
  cancelSubscription: async (id) => {
    await api.post(`/admin/subscriptions/${id}/cancel/`);
    get().fetchSubscriptions();
  },
  expireSubscription: async (id) => {
    await api.post(`/admin/subscriptions/${id}/expire/`);
    get().fetchSubscriptions();
  },
  restoreSubscription: async (id) => {
    await api.post(`/admin/subscriptions/${id}/restore/`);
    get().fetchSubscriptions();
  },

  extendTrial: async (id, days) => {
    await api.post(`/admin/trials/${id}/extend/`, { days });
    get().fetchTrials();
  },
  endTrial: async (id) => {
    await api.post(`/admin/trials/${id}/end/`);
    get().fetchTrials();
  },
  convertTrial: async (id, planId) => {
    await api.post(`/admin/trials/${id}/convert/`, { plan_id: planId });
    get().fetchTrials();
  },

  createAdmin: async (data) => {
    await api.post('/admin/admins/', data);
    get().fetchAdmins();
  },
  suspendAdmin: async (id) => {
    await api.post(`/admin/admins/${id}/suspend/`);
    get().fetchAdmins();
  },
  resetAdminPassword: async (id) => {
    await api.post(`/admin/admins/${id}/reset-password/`);
  },

  saveSettings: async (data) => {
    await api.put('/admin/settings/', data);
    get().fetchSettings();
  },

  toggleFeatureFlag: async (id) => {
    await api.post(`/admin/feature-flags/${id}/toggle/`);
    get().fetchFeatureFlags();
  },
  createFeatureFlag: async (data) => {
    await api.post('/admin/feature-flags/', data);
    get().fetchFeatureFlags();
  },

  createAppVersion: async (data) => {
    await api.post('/admin/app-versions/', data);
    get().fetchAppVersions();
  },
  notifyAppUpdate: async (id) => {
    await api.post(`/admin/app-versions/${id}/notify/`);
  },

  replyToTicket: async (ticketId, message, isInternal) => {
    await api.post(`/admin/support-tickets/${ticketId}/reply/`, { message, is_internal: isInternal });
    get().fetchSupportTickets();
  },
  closeTicket: async (ticketId) => {
    await api.post(`/admin/support-tickets/${ticketId}/close/`);
    get().fetchSupportTickets();
  },
  assignTicket: async (ticketId, adminId) => {
    await api.post(`/admin/support-tickets/${ticketId}/assign/`, { admin_id: adminId });
    get().fetchSupportTickets();
  },
  escalateTicket: async (ticketId) => {
    await api.post(`/admin/support-tickets/${ticketId}/escalate/`);
    get().fetchSupportTickets();
  },

  sendNotification: async (data) => {
    await api.post('/admin/notifications/send/', data);
  },
}));
