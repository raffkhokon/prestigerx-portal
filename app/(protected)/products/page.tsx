'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Loader2, X, CheckCircle2, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAutoDismiss } from '@/lib/useAutoDismiss';

interface Product {
  id: string;
  pharmacyId?: string;
  pharmacy?: { id: string; name: string };
  name: string;
  medicationStrength?: string;
  medicationForm?: string;
  type?: string;
  description?: string;
  price?: number;
  status: string;
  createdAt: string;
}

const emptyForm = {
  pharmacyId: '',
  name: '',
  medicationStrength: '',
  medicationForm: 'injection',
  type: '',
  description: '',
  price: '',
  status: 'active'
};

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useAutoDismiss(successMsg, setSuccessMsg);
  useAutoDismiss(errorMsg, setErrorMsg);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.data || []);
    } catch { setErrorMsg('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.replace('/prescriptions');
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.role !== 'admin') return;
    fetchData();
  }, [status, session?.user?.role, fetchData]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.role !== 'admin') return;

    fetch('/api/pharmacies')
      .then((res) => res.json())
      .then((data) => setPharmacies((data.data || []).map((p: any) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [status, session?.user?.role]);

  const handleSubmit = async () => {
    if (!form.name) { setErrorMsg('Name required'); return; }
    if (!form.pharmacyId) { setErrorMsg('Pharmacy required'); return; }
    if (!form.medicationStrength) { setErrorMsg('Strength required'); return; }
    if (!form.medicationForm) { setErrorMsg('Form required'); return; }
    setSubmitting(true);
    try {
      const endpoint = editProductId ? `/api/products/${editProductId}` : '/api/products';
      const method = editProductId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : null }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg(editProductId ? 'Product updated!' : 'Product added!');
      setShowForm(false);
      setEditProductId(null);
      setForm(emptyForm);
      fetchData();
    } catch { setErrorMsg('Failed to save'); } finally { setSubmitting(false); }
  };

  if (status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.role !== 'admin') {
    return null;
  }

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.medicationStrength?.toLowerCase().includes(q) ||
      p.medicationForm?.toLowerCase().includes(q) ||
      p.pharmacy?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" />Products</h1>
            <p className="text-slate-500 text-sm mt-0.5">{products.length} products</p>
          </div>
          <button onClick={() => { setEditProductId(null); setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            <Plus className="h-4 w-4" />Add Product
          </button>
        </div>
        {successMsg && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}<button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
        {errorMsg && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">{errorMsg}</div>}
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>

        {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div> :
          filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Package className="h-12 w-12 mb-3 opacity-30" /><p className="font-medium">No products found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Pharmacy', 'Medication', 'Strength', 'Form', 'Description', 'Price', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">{p.pharmacy?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.medicationStrength || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 capitalize">{p.medicationForm || p.type || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{p.description || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{p.price ? formatCurrency(p.price) : '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditProductId(p.id);
                            setForm({
                              pharmacyId: p.pharmacyId || '',
                              name: p.name || '',
                              medicationStrength: p.medicationStrength || '',
                              medicationForm: p.medicationForm || p.type || 'injection',
                              type: p.type || p.medicationForm || '',
                              description: p.description || '',
                              price: p.price != null ? String(p.price) : '',
                              status: p.status || 'active',
                            });
                            setShowForm(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between"><h2 className="font-bold text-slate-900">{editProductId ? 'Edit Product' : 'Add Product'}</h2><button onClick={() => { setShowForm(false); setEditProductId(null); }}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              <div>
                <label className="field-label">Pharmacy *</label>
                <select value={form.pharmacyId} onChange={(e) => setForm((f) => ({ ...f, pharmacyId: e.target.value }))} className="field-input">
                  <option value="">Select pharmacy...</option>
                  {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="field-label">Medication Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field-input" placeholder="e.g., Tirzepatide" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">Strength *</label><input value={form.medicationStrength} onChange={(e) => setForm((f) => ({ ...f, medicationStrength: e.target.value }))} className="field-input" placeholder="e.g., 15mg/mL" /></div>
                <div>
                  <label className="field-label">Form *</label>
                  <select value={form.medicationForm} onChange={(e) => setForm((f) => ({ ...f, medicationForm: e.target.value, type: e.target.value }))} className="field-input">
                    <option value="injection">Injection</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="cream">Cream</option>
                    <option value="gel">Gel</option>
                    <option value="nasal_spray">Nasal Spray</option>
                  </select>
                </div>
              </div>
              <div><label className="field-label">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="field-input resize-none" rows={3} /></div>
              <div><label className="field-label">Price ($)</label><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="field-input" /></div>
              <div><label className="field-label">Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="field-input"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowForm(false); setEditProductId(null); }} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{editProductId ? 'Update Product' : 'Add Product'}</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`.field-label{display:block;font-size:.8125rem;font-weight:500;color:#374151;margin-bottom:.375rem}.field-input{width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.field-input:focus{box-shadow:0 0 0 2px #3b82f6;border-color:transparent}`}</style>
    </div>
  );
}
