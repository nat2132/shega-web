import { create } from 'zustand';
import api from '@/lib/api';
import type { User, LoginResponse } from '@/lib/types';

interface RegisterData {
  email: string;
  full_name: string;
  phone_number: string;
  password: string;
  password2: string;
}

interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  profile?: {
    company_name?: string;
    contact_person?: string;
    phone_number?: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<LoginResponse>('/auth/login/', { email, password });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData: RegisterData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<LoginResponse>('/auth/register/', registerData);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { data } = await api.get<User>('/auth/profile/');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (profileData: UpdateProfileData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.patch<User>('/auth/profile/', profileData);
      set({ user: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
