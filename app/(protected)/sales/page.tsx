'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DollarSign, Loader2, TrendingUp, Receipt } from 'lucide-react';
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

interface Clinic { id: string; name: string; salesRepId?: string | null; salesRep?: { id: string; name: string } | null }
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

interface Rollups {
  kpis: { orders: number; revenue: number; profit: number; avgMarginPct: number };
  byRep: Array<{ repId: string; repName: string; orders: number; revenue: number; profit: number }>;
  byClinic: Array<{ clinicId: string; clinicName: string; orders: number; revenue: number; profit: number }>;
  byPharmacy: Array<{ pharmacyId: string; pharmacyName: string; orders: number; revenue: number; profit: number }>;
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
  const [savingFloors, setSavingFloors] = useState(false);
  const [rollups, setRollups] = useState<Rollups | null>(null);

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
      fetch('/api/sales/rollups', { cache: 'no-store' }).then((res) => res.json()),
    ])
      .then(([ledgerData, clinicsData, pharmacyData, rollupData]) => {
        setRows(ledgerData.data || []);
        setClinics((clinicsData.data || []).map((c: any) => ({ id: c.id, name: c.name, salesRepId: c.salesRepId, salesRep: c.salesRep ? { id: c.salesRep.id, name: c.salesRep.name } : null })));

        setPharmacies((pharmacyData.data || []).map((p: any) => ({ id: p.id, name: p.name })));
        setRollups(rollupData || null);
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

  const selectedClinic = useMemo(() => clinics.find((c) => c.id === clinicId) || null, [clinics, clinicId]);
  const canManageFloors = role === 'admin' || role === 'sales_manager';
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

  const saveFloors = async () => {
    if (!canManageFloors || !selectedClinic?.salesRepId || !pharmacyId) return;
    setSavingFloors(true);
    try {
      const items = catalogRows
        .filter((r) => r.floorPrice != null)
        .map((r) => ({
          salesRepId: selectedClinic.salesRepId,
          pharmacyId,
          productId: r.productId,
          floorPrice: Number(r.floorPrice),
        }));

      await fetch('/api/sales/floors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSavingFloors(false);
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

      <div className="panel mt-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Paid Orders</p>
            <p className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Receipt className="h-4 w-4 text-blue-600" />{rollups?.kpis?.orders ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(rollups?.kpis?.revenue ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Profit (Offer - Floor)</p>
            <p className="text-lg font-semibold text-emerald-700">{formatCurrency(rollups?.kpis?.profit ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Avg Margin</p>
            <p className="text-lg font-semibold text-slate-900 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />{(rollups?.kpis?.avgMarginPct ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {role !== 'sales_rep' && rollups && (
        <div className="panel mt-4 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Team Rollups</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-2">By Rep</p>
              <div className="space-y-1">
                {rollups.byRep.slice(0, 5).map((r) => (
                  <div key={r.repId} className="flex items-center justify-between">
                    <span>{r.repName}</span>
                    <span className="font-medium">{formatCurrency(r.profit)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-2">By Clinic</p>
              <div className="space-y-1">
                {rollups.byClinic.slice(0, 5).map((c) => (
                  <div key={c.clinicId} className="flex items-center justify-between">
                    <span>{c.clinicName}</span>
                    <span className="font-medium">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 space-y-1">
            <p><strong>Pricing columns:</strong> Base = admin baseline. Rep/Manager Floor = internal minimum. Offer Price = clinic-facing price.</p>
            <p><strong>Visibility:</strong> clinic/provider only see Offer Price. Base/Floor are sales/admin only.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="field-input">
              <option value="">Select clinic</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="field-input">
              <option value="">Select pharmacy</option>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={saveCatalog} disabled={saving || !dirtyCount} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
              {saving ? 'Saving...' : `Save ${dirtyCount} offer price(s)`}
            </button>
            {canManageFloors ? (
              <button onClick={saveFloors} disabled={savingFloors || !selectedClinic?.salesRepId} className="bg-slate-800 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                {savingFloors ? 'Saving...' : 'Save floor prices'}
              </button>
            ) : <div />}
          </div>

          {selectedClinic && (
            <p className="text-xs text-slate-600">Rep for this clinic: <span className="font-medium">{selectedClinic.salesRep?.name || 'Unassigned'}</span></p>
          )}

          {catalogLoading ? (
            <div className="py-10 text-center text-slate-500">Loading catalog…</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Medication</th>
                    {role === 'admin' && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Base</th>}
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Rep/Manager Floor</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Offer Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogRows.map((r) => {
                    const belowFloor = r.floorPrice != null && r.offeredPrice != null && r.offeredPrice < r.floorPrice;
                    return (
                      <tr key={r.productId} className={belowFloor ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-sm text-slate-800">{r.name} {r.strength ? `• ${r.strength}` : ''} {r.form ? `• ${r.form}` : ''}</td>
                        {role === 'admin' && <td className="px-3 py-2 text-sm">{formatCurrency(r.basePrice || 0)}</td>}
                        <td className="px-3 py-2 text-sm">
                          {canManageFloors ? (
                            <input
                              type="number"
                              step="0.01"
                              value={r.floorPrice ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setCatalogRows((prev) => prev.map((x) => x.productId === r.productId ? { ...x, floorPrice: val } : x));
                              }}
                              className="field-input max-w-[140px]"
                            />
                          ) : r.floorPrice == null ? (
                            <span className="text-amber-700">No floor set</span>
                          ) : (
                            formatCurrency(r.floorPrice)
                          )}
                        </td>
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
