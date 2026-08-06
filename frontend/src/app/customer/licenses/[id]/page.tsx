'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Key,
  Copy,
  Check,
  Smartphone,
  Monitor,
  XCircle,
  RefreshCw,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import type { License, DeviceActivation, Payment } from '@/lib/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Active', class: 'bg-muted text-foreground font-semibold border-border' },
  expired: { label: 'Expired', class: 'bg-muted text-muted-foreground border-border' },
  suspended: { label: 'Suspended', class: 'bg-muted text-muted-foreground border-border' },
  revoked: { label: 'Revoked', class: 'bg-muted text-muted-foreground border-border' },
  trial: { label: 'Trial', class: 'bg-muted text-foreground font-semibold border-border' },
  pending: { label: 'Pending', class: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground border-border' },
};

export default function LicenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [license, setLicense] = useState<License | null>(null);
  const [devices, setDevices] = useState<DeviceActivation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: lic } = await api.get(`/customers/licenses/${params.id}/`);
        setLicense(lic);
        setDaysRemaining(Math.ceil((new Date(lic.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        const { data: devs } = await api.get(`/customers/licenses/${params.id}/devices/`);
        setDevices(Array.isArray(devs) ? devs : devs.results ?? []);

        const { data: pays } = await api.get(`/customers/licenses/${params.id}/payments/`);
        setPayments(Array.isArray(pays) ? pays : pays.results ?? []);
      } catch {
        router.push('/customer/licenses');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetch();
  }, [params.id, router]);

  const copyKey = async () => {
    if (!license) return;
    try {
      await navigator.clipboard.writeText(license.license_key);
      setCopied(true);
      toast.success('License key copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
        <div className="glass-card rounded-xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 w-full rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!license) return null;

  const status = statusConfig[license.status];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.push('/customer/licenses')}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">License Details</h2>
          <p className="text-gray-400 text-sm mt-0.5">{typeof license.plan === 'object' ? license.plan.name : 'N/A'}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="h-4 w-4 text-foreground" />
                License Information
              </h3>
              <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', status.class)}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">License Key</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg truncate">
                    {license.license_key}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Plan</p>
                <p className="text-sm text-gray-300 mt-1">{typeof license.plan === 'object' ? license.plan.name : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Issued Date</p>
                <p className="text-sm text-gray-300 mt-1">{formatDate(license.issued_date || license.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Expiry Date</p>
                <p className="text-sm text-gray-300 mt-1">{formatDate(license.expiry_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Days Remaining</p>
                <p
                  className={cn(
                    'text-sm mt-1',
                    daysRemaining <= 7 ? 'text-foreground font-semibold' : daysRemaining <= 30 ? 'text-muted-foreground' : 'text-muted-foreground'
                  )}
                >
                  {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Device Usage</p>
                <p className="text-sm text-gray-300 mt-1">
                  {license.activated_devices} of {license.max_activations} devices
                </p>
              </div>
            </div>

            {license.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Notes</p>
                <p className="text-sm text-gray-300 mt-1">{license.notes}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Smartphone className="h-4 w-4 text-foreground" />
              Active Devices ({devices.length})
            </h3>

            {devices.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No devices activated.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left text-gray-500 font-medium py-2 pr-4">Device Name</th>
                      <th className="text-left text-gray-500 font-medium py-2 pr-4">OS</th>
                      <th className="text-left text-gray-500 font-medium py-2 pr-4">Device ID</th>
                      <th className="text-left text-gray-500 font-medium py-2 pr-4">Last Seen</th>
                      <th className="text-right text-gray-500 font-medium py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr key={device.id} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-gray-300 truncate max-w-[160px]">
                              {device.device_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-gray-400 text-xs">{device.ip_address}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <code className="text-xs text-gray-500 font-mono">{device.device_id}</code>
                        </td>
                        <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(device.last_seen)}</td>
                        <td className="py-3 text-right">
                          <Button variant="danger" size="sm" icon={XCircle}>
                            Deactivate
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-foreground" />
              Audit Log
            </h3>
            <div className="space-y-1">
              <div className="flex items-start gap-3 p-3 rounded-lg">
                <div className="h-2 w-2 mt-2 rounded-full bg-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">License created</p>
                  <p className="text-xs text-gray-500">{formatDate(license.issued_date || license.start_date)}</p>
                </div>
              </div>
              {devices.map((d) => (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg">
                  <div className="h-2 w-2 mt-2 rounded-full bg-muted shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">Device activated: {d.device_name}</p>
                    <p className="text-xs text-gray-500">{formatDate(d.activated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-3">
              <Button variant="primary" icon={RefreshCw} className="w-full justify-center">
                Renew License
              </Button>
              <Button variant="secondary" icon={XCircle} className="w-full justify-center">
                Deactivate All Devices
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-foreground" />
              Invoice History
            </h3>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm py-2 text-center">No invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div>
                      <p className="text-sm text-gray-300">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(p.paid_at || '')}</p>
                    </div>
                    <Link href={`/customer/invoices`}>
                      <ExternalLink className="h-4 w-4 text-foreground hover:text-muted-foreground cursor-pointer" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
