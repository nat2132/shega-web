'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  KeyRound,
  MonitorSmartphone,
  Building2,
  Smartphone,
  Plus,
  Banknote,
  Wallet,
  ShieldCheck,
  RefreshCcw,
  CreditCard,
  X,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import type { Payment, LicensePlan } from '@/lib/types';
import toast from 'react-hot-toast';

interface DeviceUsage {
  allocated: number;
  used: number;
}

interface SubscriptionView {
  status: 'none' | 'trial' | 'pending_payment' | 'payment_rejected' | 'active' | 'expired';
  access: 'full' | 'view_only';
  plan: string | null;
  plan_name: string | null;
  plan_id: number | null;
  license_key: string | null;
  started_at: string | null;
  expires_at: string | null;
  days_remaining: number;
  is_trial: boolean;
  trial_days_remaining: number;
  devices: { mobile: DeviceUsage; desktop: DeviceUsage };
  businesses: { allocated: number; used: number };
  monthly: {
    base_price: number;
    additional_mobile_devices: number;
    additional_desktop_devices: number;
    additional_businesses: number;
    total: number;
  };
  pending_payment: {
    payment_id: number;
    amount: number;
    plan: string | null;
    plan_name: string | null;
    payment_method: string;
    description: string;
    created_at: string;
  } | null;
  last_payment: { payment_id: number; amount: number; status: string; reason: string | null; created_at: string } | null;
}

const statusMeta: Record<
  SubscriptionView['status'],
  { label: string; icon: typeof CheckCircle2; class: string; description: string }
> = {
  active: {
    label: 'Active',
    icon: CheckCircle2,
    class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Your subscription is active. Full access is enabled.',
  },
  trial: {
    label: 'Trial',
    icon: Sparkles,
    class: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    description: 'Enjoying a free 7-day trial of the plan you picked.',
  },
  pending_payment: {
    label: 'Payment Pending',
    icon: Clock,
    class: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Your payment is awaiting admin approval.',
  },
  payment_rejected: {
    label: 'Payment Rejected',
    icon: XCircle,
    class: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Your latest payment was rejected. Please review the reason and resubmit.',
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    class: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    description: 'Your subscription has expired. Renew to restore full access.',
  },
  none: {
    label: 'Not Started',
    icon: Sparkles,
    class: 'bg-muted text-muted-foreground border-border',
    description: 'Pick a plan and start a 7-day free trial, or subscribe now.',
  },
};

type ModalMode = 'subscribe' | 'addon';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [licenseId, setLicenseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modal, setModal] = useState<{ open: boolean; mode: ModalMode; addonType?: string; quantity: number }>({
    open: false,
    mode: 'subscribe',
    quantity: 1,
  });
  const [form, setForm] = useState({ plan: '', payment_method: 'telebirr', transaction_id: '' });

  const fetchAll = async () => {
    const [statusRes, plansRes, payRes, licensesRes] = await Promise.all([
      api.get('/customers/subscription/status'),
      api.get('/plans'),
      api.get('/customers/payments'),
      api.get('/customers/licenses'),
    ]);
    setSubscription(statusRes.data);
    setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data.results ?? []);
    setPayments(Array.isArray(payRes.data) ? payRes.data : payRes.data.results ?? []);
    const licenses = Array.isArray(licensesRes.data) ? licensesRes.data : licensesRes.data.results ?? [];
    const active = licenses.find(
      (l: { status: string }) => l.status === 'active'
    );
    setLicenseId(active?.id ?? null);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchAll();
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startTrial = async (planId: number) => {
    setSubmitting(true);
    try {
      await api.post('/subscription/trial', { plan_id: planId });
      toast.success('Your 7-day free trial has started');
      await fetchAll();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not start your trial');
    } finally {
      setSubmitting(false);
    }
  };

  const openSubscribe = () => {
    setModal({ open: true, mode: 'subscribe', quantity: 1 });
    setForm((prev) => ({ ...prev, plan: prev.plan || String(subscription?.plan_id ?? '') }));
  };

  const openAddon = (addonType: string) => {
    setModal({ open: true, mode: 'addon', addonType, quantity: 1 });
  };

  const submitPayment = async () => {
    if (!form.transaction_id) {
      toast.error('Please enter your transaction ID');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        payment_method: form.payment_method,
        transaction_id: form.transaction_id,
      };
      if (modal.mode === 'addon') {
        if (!licenseId || !modal.addonType) {
          toast.error('You need an active subscription to purchase an add-on');
          return;
        }
        payload.license_id = licenseId;
        payload.payment_type = modal.addonType;
        payload.quantity = modal.quantity;
        payload.plan = subscription?.plan_id;
      } else {
        if (!form.plan) {
          toast.error('Please choose a plan');
          return;
        }
        payload.plan = Number(form.plan);
        payload.payment_type = 'subscription';
      }
      await api.post('/customers/payments', payload);

      toast.success('Payment submitted for approval');
      setModal({ open: false, mode: 'subscribe', quantity: 1 });
      setForm((prev) => ({ ...prev, transaction_id: '' }));
      await fetchAll();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const breakdown = useMemo(() => {
    if (!subscription || (!subscription.plan_id && subscription.status === 'none')) return null;
    const lines: { label: string; amount: number }[] = [];
    if (subscription.monthly.base_price > 0) {
      lines.push({ label: `${subscription.plan_name ?? 'Plan'} (base)`, amount: subscription.monthly.base_price });
    }
    const extras: [keyof SubscriptionView['monthly'], string][] = [
      ['additional_mobile_devices', 'Additional mobile device'],
      ['additional_desktop_devices', 'Additional desktop device'],
      ['additional_businesses', 'Additional business'],
    ];
    for (const [key, label] of extras) {
      if (subscription.monthly[key] > 0) lines.push({ label, amount: subscription.monthly[key] });
    }
    return lines;
  }, [subscription]);

  const viewOnly = subscription?.access === 'view_only' && subscription?.status !== 'none';

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!subscription) return null;

  const meta = statusMeta[subscription.status];
  const StatusIcon = meta.icon;
  const remaining = subscription.is_trial ? subscription.trial_days_remaining : subscription.days_remaining;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription</h2>
          <p className="text-gray-400 mt-1">Manage your plan, devices, trial and payments.</p>
        </div>
        {subscription.access === 'full' && (subscription.status === 'active' || subscription.status === 'trial') && (
          <Button variant="secondary" icon={RefreshCcw} onClick={() => fetchAll()}>
            Refresh
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className={cn('glass-card rounded-2xl p-6 border', meta.class)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-background/60 flex items-center justify-center">
              <StatusIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Current status</div>
              <div className="text-xl font-bold text-white">{meta.label}</div>
            </div>
          </div>
          <div className="text-right">
            {subscription.status === 'trial' && (
              <div className="text-sm font-semibold text-violet-400">{remaining} days of trial left</div>
            )}
            {subscription.status === 'active' && subscription.expires_at && (
              <div className="text-sm text-gray-400">
                Renews on <span className="text-white font-semibold">{formatDate(subscription.expires_at)}</span>
              </div>
            )}
            {subscription.expires_at && (
              <div className="text-xs text-gray-500 mt-1">
                {remaining} days remaining
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-3">{meta.description}</p>
        {subscription.plan_name && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <ShieldCheck className="h-4 w-4 text-gray-500" />
            <span className="text-gray-400">
              Plan: <span className="text-white font-medium">{subscription.plan_name}</span>
            </span>
            {subscription.license_key && (
              <code className="text-xs font-mono text-gray-500 bg-background/60 px-2 py-0.5 rounded-md">
                {subscription.license_key}
              </code>
            )}
          </div>
        )}
      </motion.div>

      {viewOnly && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5"
        >
          <Eye className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            You are in <span className="font-semibold">view-only mode</span>. Changing data in Shega mobile and desktop
            is locked until your subscription is approved or renewed.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {subscription.pending_payment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-4 border border-amber-500/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="text-sm text-gray-300">
                  Payment awaiting review:{' '}
                  <span className="text-white font-semibold">
                    {formatCurrency(subscription.pending_payment.amount)}
                  </span>{' '}
                  via {subscription.pending_payment.payment_method} on{' '}
                  {formatDate(subscription.pending_payment.created_at)}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {subscription.pending_payment.plan_name ?? 'Subscription'}
              </div>
            </div>
          </motion.div>
        )}

        {subscription.last_payment && subscription.status === 'payment_rejected' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-4 border border-rose-500/20 bg-rose-500/5"
          >
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <div className="font-semibold text-rose-300">
                  Payment of {formatCurrency(subscription.last_payment.amount)} was rejected
                </div>
                {subscription.last_payment.reason && (
                  <p className="text-gray-400 mt-1">Reason: {subscription.last_payment.reason}</p>
                )}
                <p className="text-gray-500 mt-1 text-xs">Submitted {formatDate(subscription.last_payment.created_at)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {subscription.status === 'none' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Start your subscription</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.filter((p) => p.is_active).map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="glass-card rounded-2xl p-6 flex flex-col"
              >
                <div className="text-lg font-bold text-white">{plan.name}</div>
                <div className="text-sm text-gray-400 mt-1">{plan.description}</div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-bold text-white">{formatCurrency(plan.price)}</span>
                  <span className="text-sm text-gray-500 mb-1">/month</span>
                </div>
                <div className="mt-auto pt-5 space-y-3">
                  <Button
                    variant="primary"
                    className="w-full justify-center"
                    icon={Sparkles}
                    isLoading={submitting}
                    onClick={() => startTrial(plan.id)}
                  >
                    Start 7-Day Free Trial
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, plan: String(plan.id) }));
                      openSubscribe();
                    }}
                  >
                    Subscribe Now
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {(subscription.status === 'active' || subscription.status === 'trial') && (
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card rounded-2xl p-6 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Usage & Caps</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MonitorSmartphone className="h-4 w-4" /> Desktop devices
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {subscription.devices.desktop.used}
                  <span className="text-gray-500 text-base font-normal"> / {subscription.devices.desktop.allocated}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-3" icon={Plus} onClick={() => openAddon('additional_desktop_device')}>
                  Add
                </Button>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Smartphone className="h-4 w-4" /> Mobile devices
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {subscription.devices.mobile.used}
                  <span className="text-gray-500 text-base font-normal"> / {subscription.devices.mobile.allocated}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-3" icon={Plus} onClick={() => openAddon('additional_mobile_device')}>
                  Add
                </Button>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Building2 className="h-4 w-4" /> Businesses
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {subscription.businesses.used}
                  <span className="text-gray-500 text-base font-normal"> / {subscription.businesses.allocated}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-3" icon={Plus} onClick={() => openAddon('additional_business')}>
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-5">
              <Button variant="secondary" icon={KeyRound} onClick={() => (window.location.href = '/customer/licenses')}>
                Manage License Keys
              </Button>
              <Button variant="primary" icon={RefreshCcw} onClick={openSubscribe}>
                Renew Subscription
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Monthly Cost</h3>
            {breakdown && breakdown.length > 0 ? (
              <div className="space-y-2">
                {breakdown.map((line, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">{line.label}</span>
                    <span className="text-gray-200">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--color-border)] pt-2 mt-2 flex justify-between">
                  <span className="font-medium text-white">Total</span>
                  <span className="font-bold text-white">{formatCurrency(subscription.monthly.total)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No breakdown available yet.</div>
            )}
            <p className="text-xs text-gray-500 mt-4">
              Add-ons are charged at {formatCurrency(subscription.monthly.total || 0) === formatCurrency(0) ? 'plan rates' : 'plan rates'} on approval.
            </p>
          </motion.div>
        </div>
      )}

      {(subscription.status === 'expired' || subscription.status === 'payment_rejected') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card rounded-xl p-5 border border-[var(--color-border)]"
        >
          <div>
            <div className="text-white font-semibold">
              {subscription.status === 'expired' ? 'Renew your subscription to continue' : 'Resubmit your payment to continue'}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {subscription.status === 'expired'
                ? 'Your plan ended on ' + (subscription.expires_at ? formatDate(subscription.expires_at) : 'the end date') + '.'
                : 'Submit a new payment with the correct details.'}
            </p>
          </div>
          <Button variant="primary" icon={CreditCard} onClick={openSubscribe} className="shrink-0">
            {subscription.status === 'expired' ? 'Renew Now' : 'Resubmit Payment'}
          </Button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-white">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No payments yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Details</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Amount</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Status</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{formatDate(payment.created_at)}</td>
                    <td className="py-3 px-4 text-gray-300">{payment.payment_type?.replace(/_/g, ' ') ?? 'Subscription'}</td>
                    <td className="py-3 px-4 text-gray-200 font-medium whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize"
                        style={{
                          borderColor: payment.status === 'rejected' ? 'rgba(244,63,94,0.3)' : payment.status === 'approved' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
                          color: payment.status === 'rejected' ? '#fb7185' : payment.status === 'approved' ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-[260px] line-clamp-2">
                      {payment.status === 'rejected' ? payment.admin_notes || '—' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {modal.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setModal({ ...modal, open: false })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="glass-card rounded-2xl p-6 w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    {modal.mode === 'addon' ? 'Purchase Add-on' : subscription?.status === 'trial' ? 'Subscribe Now' : 'Submit Payment'}
                  </h3>
                  <button
                    onClick={() => setModal({ ...modal, open: false })}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {modal.mode === 'subscribe' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Plan</label>
                      <select
                        value={form.plan}
                        onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border"
                      >
                        <option value="">Choose a plan...</option>
                        {plans.filter((p) => p.is_active).map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.price)}/month
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {modal.mode === 'addon' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Add-on</label>
                      <div className="text-sm text-gray-200 capitalize bg-white/5 rounded-xl px-3 py-2.5 border border-[var(--color-border)]">
                        {modal.addonType?.replace(/_/g, ' ')}
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={modal.quantity}
                          onChange={(e) => setModal({ ...modal, quantity: Number(e.target.value) })}
                          className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'telebirr', label: 'Telebirr', icon: Banknote },
                        { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                        { value: 'chapa', label: 'Chapa', icon: Wallet },
                        { value: 'cash', label: 'Cash', icon: Wallet },
                      ].map((method) => {
                        const isSelected = form.payment_method === method.value;
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.value}
                            onClick={() => setForm((prev) => ({ ...prev, payment_method: method.value }))}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200',
                              isSelected
                                ? 'bg-muted text-foreground border-border'
                                : 'bg-white/5 text-gray-400 border-[var(--color-border)] hover:border-white/20'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {method.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Transaction ID / Reference</label>
                    <input
                      type="text"
                      value={form.transaction_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, transaction_id: e.target.value }))}
                      placeholder="e.g. CBE-8827-445566, Telebirr TX…"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      The amount is calculated by Shega from your plan and add-ons, and verified on approval.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="secondary" onClick={() => setModal({ ...modal, open: false })} className="flex-1 justify-center">
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={submitPayment} isLoading={submitting} disabled={submitting} className="flex-1 justify-center">
                    Submit for Approval
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}