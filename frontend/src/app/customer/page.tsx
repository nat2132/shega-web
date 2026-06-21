'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  CreditCard,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface DashboardData {
  active_licenses: number;
  expiring_soon: number;
  total_payments: number;
  next_renewal: string | null;
  recent_activity: {
    id: number;
    type: string;
    title: string;
    message: string;
    created_at: string;
  }[];
}

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: res } = await api.get('/customers/dashboard/');
        setData(res);
      } catch {
        setData({
          active_licenses: 0,
          expiring_soon: 0,
          total_payments: 0,
          next_renewal: null,
          recent_activity: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    {
      label: 'Active Licenses',
      value: data?.active_licenses ?? 0,
      icon: Key,
      color: 'text-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Expiring Soon',
      value: data?.expiring_soon ?? 0,
      icon: AlertTriangle,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Payments Made',
      value: data?.total_payments ?? 0,
      icon: CreditCard,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Next Renewal',
      value: data?.next_renewal ? formatRelativeTime(data.next_renewal) : 'N/A',
      icon: CalendarClock,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
        </h2>
        <p className="text-gray-400 mt-1">Here&apos;s an overview of your account.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div className={cn('p-2.5 rounded-lg', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-4">
              {loading ? (
                <span className="inline-block h-7 w-16 rounded bg-white/5 animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-foreground" />
            Recent Activity
          </h3>
          <div className="mt-4 space-y-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))
            ) : data?.recent_activity.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">No recent activity.</p>
            ) : (
              data?.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="h-2 w-2 mt-2 rounded-full bg-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.title}</p>
                    <p className="text-xs text-gray-400 truncate">{activity.message}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Actions</h3>
          <div className="mt-4 space-y-3">
            <Link href="/customer/licenses">
              <Button variant="secondary" icon={RefreshCw} className="w-full justify-start">
                Renew License
              </Button>
            </Link>
            <Link href="/customer/payments">
              <Button variant="secondary" icon={Upload} className="w-full justify-start">
                Upload Payment
              </Button>
            </Link>
            <Link href="/customer/download">
              <Button variant="secondary" icon={Download} className="w-full justify-start">
                Download Software
              </Button>
            </Link>
              <Link href="/customer/licenses">
              <Button variant="ghost" icon={ArrowRight} className="w-full justify-start text-foreground">
                View All Licenses
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
