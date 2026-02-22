'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SalesRow {
  id: string;
  clinicName?: string;
  amount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  pharmacy?: { id: string; name: string } | null;
}

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesRow[]>([]);

  const role = session?.user?.role;
  const canView = role === 'admin' || role === 'sales_manager' || role === 'sales_rep';

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!canView) {
      router.push('/dashboard');
      return;
    }

    fetch('/api/sales/prescriptions?limit=50', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setRows(data.data || []))
      .finally(() => setLoading(false));
  }, [status, canView, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Sales Ledger (PHI-safe)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Only prescription ID + financial/order metadata</p>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Prescription ID', 'Clinic', 'Pharmacy', 'Amount', 'Payment', 'Order', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.clinicName || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.pharmacy?.name || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(r.amount || 0)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.paymentStatus}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.orderStatus}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
