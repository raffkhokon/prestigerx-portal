'use client';

import { useEffect, useMemo, useState } from 'react';
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

interface Clinic { id: string; name: string }
interface Pharmacy { id: string; name: string }
interface CatalogRow {
  productId: string;
  name: string;
  strength?: string;
  form?: string;
  basePrice: number;
  floorPrice: number | null;
  offeredPrice: number | null;
}

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [tab, setTab] = useState<'ledger' | 'catalog'>('ledger');

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [clinicId, setClinicId] = useState('');
  const [pharmacyId, setPharmacyId] = useState('');
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role;
  const canView = role === 'admin' || role === 'sales_manager' || role === 'sales_rep';

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!canView) {
      router.push('/dashboard');
      return;
    }

    Promise.all([
      fetch('/api/sales/prescriptions?limit=50', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/clinics', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/pharmacies', { cache: 'no-store' }).then((res) => res.json()),
    ])
      .then(([ledgerData, clinicsData, pharmacyData]) => {
        setRows(ledgerData.data || []);
        setClinics((clinicsData.data || []).map((c: any) => ({ id: c.id, name: c.name })));
        setPharmacies((pharmacyData.data || []).map((p: any) => ({ id: p.id, name: p.name })));
      })
      .finally(() => setLoading(false));
  }, [status, canView, router]);

  useEffect(() => {
    if (!clinicId || !pharmacyId) {
      setCatalogRows([]);
      return;
    }

    setCatalogLoading(true);
    fetch(`/api/sales/catalog?clinicId=${clinicId}&pharmacyId=${pharmacyId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setCatalogRows(data.data || []))
      .finally(() => setCatalogLoading(false));
  }, [clinicId, pharmacyId]);

  const dirtyCount = useMemo(() => catalogRows.filter((r) => r.offeredPrice != null).length, [catalogRows]);

  const saveCatalog = async () => {
    if (!clinicId || !pharmacyId) return;
    setSaving(true);
    try {
      const items = catalogRows
        .filter((r) => r.offeredPrice != null)
        .map((r) => ({ productId: r.productId, offeredPrice: Number(r.offeredPrice) }));

      await fetch('/api/sales/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, pharmacyId, items }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col page-wrap pt-6">
      <div className="panel px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Sales
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">PHI-safe sales ledger + clinic catalog pricing</p>
      </div>

      <div className="panel mt-4 p-4">
        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
          <button onClick={() => setTab('ledger')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${tab === 'ledger' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>Ledger</button>
          <button onClick={() => setTab('catalog')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${tab === 'catalog' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>Catalog Pricing</button>
        </div>
      </div>

      {tab === 'ledger' ? (
        <div className="flex-1 overflow-auto panel mt-4">
          <table className="w-full">
            <thead className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0">
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
      ) : (
        <div className="panel mt-4 p-4 space-y-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="field-input">
              <option value="">Select clinic</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="field-input">
              <option value="">Select pharmacy</option>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={saveCatalog} disabled={saving || !dirtyCount} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
              {saving ? 'Saving...' : `Save ${dirtyCount} price(s)`}
            </button>
          </div>

          {catalogLoading ? (
            <div className="py-10 text-center text-slate-500">Loading catalog…</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Medication</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Base</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Rep Floor</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Offer Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogRows.map((r) => {
                    const belowFloor = r.floorPrice != null && r.offeredPrice != null && r.offeredPrice < r.floorPrice;
                    return (
                      <tr key={r.productId} className={belowFloor ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-sm text-slate-800">{r.name} {r.strength ? `• ${r.strength}` : ''} {r.form ? `• ${r.form}` : ''}</td>
                        <td className="px-3 py-2 text-sm">{formatCurrency(r.basePrice || 0)}</td>
                        <td className="px-3 py-2 text-sm">{r.floorPrice == null ? '—' : formatCurrency(r.floorPrice)}</td>
                        <td className="px-3 py-2 text-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={r.offeredPrice ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              setCatalogRows((prev) => prev.map((x) => x.productId === r.productId ? { ...x, offeredPrice: val } : x));
                            }}
                            className="field-input max-w-[140px]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .field-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; outline: none; background: #fff; }
      `}</style>
    </div>
  );
}
