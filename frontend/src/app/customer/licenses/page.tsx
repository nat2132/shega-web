'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Copy,
  Check,
  AlertTriangle,
  Smartphone,
  Eye,
  RefreshCw,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import type { License } from '@/lib/types';
import toast from 'react-hot-toast';

const statusConfig = {
  active: { label: 'Active', class: 'bg-muted text-foreground font-semibold border-border' },
  expired: { label: 'Expired', class: 'bg-muted text-muted-foreground border-border' },
  suspended: { label: 'Suspended', class: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground border-border' },
};

function LicenseSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-white/5 animate-pulse" />
          <div className="h-4 w-48 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-12 rounded bg-white/5 animate-pulse" />
            <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/customers/licenses/');
        setLicenses(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        setLicenses([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const copyKey = async (id: number, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      toast.success('License key copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white">My Licenses</h2>
        <p className="text-gray-400 mt-1">Manage your software licenses and activations.</p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <LicenseSkeleton key={i} />
          ))}
        </div>
      ) : licenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-12 text-center"
        >
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Key className="h-7 w-7 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-white mt-4">No Licenses Yet</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            You haven&apos;t purchased any licenses yet. Browse our plans to get started.
          </p>
          <Link href="/pricing">
            <Button className="mt-6">View Plans</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {licenses.map((license, i) => {
            const status = statusConfig[license.status];
            const daysRemaining = Math.ceil(
              (new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <motion.div
                key={license.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {license.plan.name}
                      </h3>
                      <span
                        className={cn(
                          'text-xs font-medium px-2.5 py-0.5 rounded-full border',
                          status.class
                        )}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-md truncate max-w-[240px]">
                        {license.license_key}
                      </code>
                      <button
                        onClick={() => copyKey(license.id, license.license_key)}
                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {copiedId === license.id ? (
                          <Check className="h-3.5 w-3.5 text-foreground" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Start Date</p>
                    <p className="text-sm text-gray-300 mt-0.5">{formatDate(license.issued_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Expiry Date</p>
                    <p className="text-sm text-gray-300 mt-0.5">{formatDate(license.expiry_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Days Remaining</p>
                    <p
                      className={cn(
                        'text-sm mt-0.5',
                        daysRemaining <= 7 ? 'text-foreground font-semibold' : daysRemaining <= 30 ? 'text-muted-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Devices</p>
                    <p className="text-sm text-gray-300 mt-0.5 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-foreground" />
                      {license.activated_devices} of {license.max_activations} used
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                  <Link href={`/customer/licenses/${license.id}`}>
                    <Button variant="secondary" size="sm" icon={Eye}>
                      View Details
                    </Button>
                  </Link>
                  <Button variant="primary" size="sm" icon={RefreshCw}>
                    Renew
                  </Button>
                  <Button variant="danger" size="sm" icon={XCircle}>
                    Deactivate Device
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
