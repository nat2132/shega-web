'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import type { Invoice } from '@/lib/types';

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: 'Draft', class: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', class: 'bg-muted text-muted-foreground border-border' },
  paid: { label: 'Paid', class: 'bg-muted text-foreground font-semibold border-border' },
  overdue: { label: 'Overdue', class: 'bg-muted text-foreground font-semibold border-border' },
  cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground border-border' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/customers/invoices/');
        setInvoices(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white">Invoices</h2>
        <p className="text-gray-400 mt-1">View and download your invoices.</p>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-12 text-center"
        >
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-7 w-7 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-white mt-4">No Invoices</h3>
          <p className="text-gray-400 text-sm mt-1">Invoices will appear here once you make a purchase.</p>
        </motion.div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Invoice #</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Amount</th>
                  <th className="text-left text-gray-500 font-medium py-3 px-4">Status</th>
                  <th className="text-right text-gray-500 font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, i) => {
                  const status = statusConfig[invoice.status] || statusConfig.draft;
                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-gray-300">{invoice.invoice_number}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                        {formatDate(invoice.issued_date || '')}
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-medium whitespace-nowrap">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', status.class)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={Eye}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" icon={Download}>
                            PDF
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
