'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Upload,
  X,
  Check,
  FileText,
  DollarSign,
  Banknote,
  Building2,
  Wallet,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import type { Payment, LicensePlan } from '@/lib/types';
import toast from 'react-hot-toast';

type PaymentTab = 'all' | 'pending' | 'approved' | 'rejected';

const tabs: { key: PaymentTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-muted text-muted-foreground border-border' },
  completed: { label: 'Approved', class: 'bg-muted text-foreground font-semibold border-border' },
  approved: { label: 'Approved', class: 'bg-muted text-foreground font-semibold border-border' },
  failed: { label: 'Rejected', class: 'bg-muted text-muted-foreground border-border' },
  rejected: { label: 'Rejected', class: 'bg-muted text-muted-foreground border-border' },
  refunded: { label: 'Refunded', class: 'bg-muted text-muted-foreground border-border' },
};

const methodIcons: Record<string, typeof CreditCard> = {
  telebirr: Banknote,
  bank_transfer: Building2,
  chapa: Wallet,
  cash: Wallet,
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    plan: '',
    payment_method: '',
    amount: '',
    receipt: null as File | null,
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/customers/payments/');
        setPayments(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/plans/');
        setPlans(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        // silently fail
      }
    };
    if (showModal) fetchPlans();
  }, [showModal]);

  const filtered = activeTab === 'all'
    ? payments
    : payments.filter((p) => {
        if (activeTab === 'pending') return p.status === 'pending';
        if (activeTab === 'approved') return p.status === 'approved';
        if (activeTab === 'rejected') return p.status === 'rejected';
        return true;
      });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormData((prev) => ({ ...prev, receipt: file }));
    } else {
      toast.error('Please upload an image file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, receipt: file }));
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => String(p.id) === planId);
    setFormData((prev) => ({
      ...prev,
      plan: planId,
      amount: plan ? String(plan.price) : '',
    }));
  };

  const handleSubmit = async () => {
    if (!formData.plan || !formData.payment_method || !formData.receipt) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('plan', formData.plan);
      fd.append('payment_method', formData.payment_method);
      fd.append('amount', formData.amount);
      fd.append('receipt', formData.receipt);

      await api.post('/customers/payments/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Payment submitted successfully');
      setShowModal(false);
      setFormData({ plan: '', payment_method: '', amount: '', receipt: null });

      const { data } = await api.get('/customers/payments/');
      setPayments(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      toast.error('Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Payments</h2>
          <p className="text-gray-400 mt-1">View your payment history and make new payments.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={Plus}>
          Make Payment
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-1 p-1 glass rounded-xl w-fit"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              activeTab === tab.key
                ? 'bg-muted text-foreground'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-12 text-center"
        >
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <CreditCard className="h-7 w-7 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-white mt-4">No Payments Found</h3>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'all' ? 'No payments yet.' : `No ${activeTab} payments.`}
          </p>
        </motion.div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Amount</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Method</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Transaction ID</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Status</th>
                  <th className="text-right text-gray-500 font-medium py-3 px-4">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment, i) => {
                  const status = statusConfig[payment.status] || statusConfig.pending;
                  const MethodIcon = methodIcons[payment.payment_method] || CreditCard;
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-medium whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300 capitalize">{payment.payment_method.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-gray-400">{payment.transaction_id || '-'}</code>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', status.class)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" icon={FileText}>
                          View
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
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
                  <h3 className="text-lg font-semibold text-white">Make Payment</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Plan</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none focus:border-border"
                    >
                      <option value="">Choose a plan...</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'telebirr', label: 'Telebirr', icon: Banknote },
                        { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                        { value: 'chapa', label: 'Chapa', icon: Wallet },
                        { value: 'cash', label: 'Cash', icon: Wallet },
                      ].map((method) => {
                        const isSelected = formData.payment_method === method.value;
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.value}
                            onClick={() => setFormData((prev) => ({ ...prev, payment_method: method.value }))}
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
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        type="number"
                        value={formData.amount}
                        readOnly
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-[var(--color-border)] text-gray-300 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Upload Receipt</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                        dragOver
                          ? 'border-border bg-muted'
                          : formData.receipt
                            ? 'border-border bg-muted'
                            : 'border-[var(--color-border)] hover:border-white/20'
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {formData.receipt ? (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5 text-foreground" />
                          <span className="text-sm text-gray-300">{formData.receipt.name}</span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">
                            Drop payment receipt here or click to browse
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="flex-1 justify-center"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    disabled={submitting}
                    className="flex-1 justify-center"
                  >
                    {submitting ? 'Submitting...' : 'Submit Payment'}
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
