'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Loader2, X, CheckCircle2, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  createdAt: string;
  _count?: { patients: number; prescriptions: number };
}

const emptyForm = { name: '', address: '', phone: '', email: '', status: 'active' };

export default function ClinicsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Clinic | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selected, setSelected] = useState<Clinic | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/prescriptions');
    }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinics');
      const data = await res.json();
      setClinics(data.data || []);
    } catch { setErrorMsg('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.name) { setErrorMsg('Name is required'); return; }
    setSubmitting(true);
    try {
      const url = editItem ? `/api/clinics/${editItem.id}` : '/api/clinics';
      const res = await fetch(url, {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg(editItem ? 'Clinic updated!' : 'Clinic created!');
      setShowForm(false);
      fetchData();
    } catch { setErrorMsg('Failed to save'); } finally { setSubmitting(false); }
  };

  const filtered = clinics.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />Clinics
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{clinics.length} registered clinics</p>
          </div>
          <button onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            <Plus className="h-4 w-4" />Add Clinic
          </button>
        </div>
        {successMsg && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}<button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
        {errorMsg && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm"><AlertCircle className="h-4 w-4 text-red-600" />{errorMsg}<button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${selected ? 'w-1/2' : 'flex-1'} flex flex-col bg-white border-r border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div> :
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{c.name}</p>
                      {c.address && <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</p>}
                      {c._count && <p className="text-slate-400 text-xs mt-0.5">{c._count.patients} patients • {c._count.prescriptions} prescriptions</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                  </div>
                </button>
              ))}
            </div>
          }
        </div>

        {selected && (
          <div className="w-1/2 bg-white overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-lg">{selected.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => { setEditItem(selected); setForm({ name: selected.name, address: selected.address || '', phone: selected.phone || '', email: selected.email || '', status: selected.status }); setShowForm(true); }} className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Edit</button>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              {selected.phone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selected.phone}</p>}
              {selected.email && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selected.email}</p>}
              {selected.address && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selected.address}</p>}
              {selected._count && <p className="text-sm text-slate-600">{selected._count.patients} patients • {selected._count.prescriptions} prescriptions</p>}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between"><h2 className="font-bold text-slate-900">{editItem ? 'Edit Clinic' : 'Add Clinic'}</h2><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="field-label">Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field-input" /></div>
              <div><label className="field-label">Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="field-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="field-input" /></div>
                <div><label className="field-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field-input" /></div>
              </div>
              <div><label className="field-label">Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="field-input"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`.field-label{display:block;font-size:.8125rem;font-weight:500;color:#374151;margin-bottom:.375rem}.field-input{width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.field-input:focus{box-shadow:0 0 0 2px #3b82f6;border-color:transparent}`}</style>
    </div>
  );
}
