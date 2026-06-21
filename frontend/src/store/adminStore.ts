import { create } from 'zustand';
import api from '@/lib/api';
import type { User, Payment, License, DashboardMetrics, PaginatedResponse } from '@/lib/types';

type PaymentAction = 'approve' | 'reject';

interface AdminState {
  metrics: DashboardMetrics | null;
  customers: User[];
  payments: Payment[];
  licenses: License[];
  isLoading: boolean;
  fetchDashboard: () => Promise<void>;
  fetchCustomers: (page?: number) => Promise<PaginatedResponse<User>>;
  fetchPayments: (page?: number) => Promise<PaginatedResponse<Payment>>;
  fetchLicenses: (page?: number) => Promise<PaginatedResponse<License>>;
  reviewPayment: (id: number, action: PaymentAction) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  metrics: null,
  customers: [],
  payments: [],
  licenses: [],
  isLoading: false,

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<DashboardMetrics>('/admin/dashboard/');
      set({ metrics: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCustomers: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<PaginatedResponse<User>>('/admin/customers/', {
        params: { page },
      });
      set({ customers: data.results, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchPayments: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<PaginatedResponse<Payment>>('/admin/payments/', {
        params: { page },
      });
      set({ payments: data.results, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchLicenses: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<PaginatedResponse<License>>('/admin/licenses/', {
        params: { page },
      });
      set({ licenses: data.results, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  reviewPayment: async (id: number, action: PaymentAction) => {
    set({ isLoading: true });
    try {
      await api.post(`/admin/payments/${id}/review/`, { action });
      const { data } = await api.get<PaginatedResponse<Payment>>('/admin/payments/');
      set({ payments: data.results, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
