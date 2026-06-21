'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, MapPin, Lock, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, isLoading: authLoading } = useAuthStore();
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    company_name: '',
    business_type: '',
    address: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        company_name: user.profile?.company_name || '',
        business_type: '',
        address: user.profile?.address || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        phone_number: profileForm.phone_number,
        profile: {
          company_name: profileForm.company_name,
          contact_person: profileForm.full_name,
          phone_number: profileForm.phone_number,
          address: profileForm.address,
          city: '',
          country: '',
          tax_id: '',
        },
      });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const api = (await import('@/lib/api')).default;
      await api.post('/auth/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="text-gray-400 mt-1">Manage your account information and security.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--color-border)]">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-foreground shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{user?.full_name || 'User'}</h3>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <User className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Mail className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-500 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Phone className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Phone Number
            </label>
            <input
              type="text"
              value={profileForm.phone_number}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone_number: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Building2 className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Business Name
            </label>
            <input
              type="text"
              value={profileForm.company_name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, company_name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Building2 className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Business Type
            </label>
            <select
              value={profileForm.business_type}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, business_type: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            >
              <option value="">Select type...</option>
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="llc">Limited Liability Company</option>
              <option value="corporation">Corporation</option>
              <option value="nonprofit">Non-Profit</option>
              <option value="government">Government</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <MapPin className="h-3.5 w-3.5 inline mr-1.5 text-foreground" />
              Address
            </label>
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <Button
            onClick={handleSaveProfile}
            isLoading={savingProfile}
            disabled={savingProfile}
            icon={Save}
          >
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-foreground" />
          Change Password
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleChangePassword}
            variant="secondary"
            isLoading={savingPassword}
            disabled={savingPassword}
            icon={Lock}
          >
            {savingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
