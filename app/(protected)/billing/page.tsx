'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Loader2, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';

interface Transaction {
  id: string;
  clinicName?: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  prescription: {
    id: string;
    patientName: string;
    medicationName?: string;
    orderStatus: string;
  } | null;
}

interface Totals {
  totalAmount: number;
  totalTransactions: number;
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalAmount: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing?page=${page}&limit=20`);
      const data = await res.json();
      setTransactions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
      setTotals(data.totals || { totalAmount: 0, totalTransactions: 0 });
    } catch {
      console.error('Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pending = transactions.filter((t) => t.status === 'pending').length;
  const paid = transactions.filter((t) => t.status === 'paid').length;

  return (
    <div className="h-full flex flex-col page-wrap pt-6">
      <div className="panel px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Billing
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Transaction history and revenue tracking</p>
      </div>

      {/* Stats */}
      <div className="panel px-6 py-5 mt-4">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            label="Total Revenue"
            value={formatCurrency(totals.totalAmount)}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            label="Transactions"
            value={String(totals.totalTransactions)}
            color="blue"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
            label="Pending"
            value={String(pending)}
            color="yellow"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            label="Paid"
            value={String(paid)}
            color="emerald"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto panel mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CreditCard className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Patient', 'Medication', 'Type', 'Amount', 'Status', 'Order Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.prescription?.patientName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.prescription?.medicationName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">{t.type}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(t.prescription?.orderStatus || '')}`}>
                      {t.prescription?.orderStatus || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
          <button onClick={() => fetchData(pagination.page - 1)} disabled={pagination.page <= 1} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</span>
          <button onClick={() => fetchData(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bg: Record<string, string> = { green: 'bg-green-50', blue: 'bg-blue-50', yellow: 'bg-yellow-50', emerald: 'bg-emerald-50' };
  return (
    <div className={`${bg[color] || 'bg-slate-50'} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-slate-600 uppercase">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
