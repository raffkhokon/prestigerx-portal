'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Loader2, X, CheckCircle2, AlertCircle, Phone, Mail, MapPin, ChevronDown, Check } from 'lucide-react';
import { useAutoDismiss } from '@/lib/useAutoDismiss';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  createdAt: string;
  salesRepId?: string | null;
  salesRep?: { id: string; name: string; email?: string } | null;
  pharmacies?: Array<{ pharmacyId: string; pharmacy?: { id: string; name: string } }>;
  _count?: { patients: number; prescriptions: number };
}

const emptyForm = { name: '', address: '', phone: '', email: '', status: 'active', salesRepId: '', pharmacyIds: [] as string[] };

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

  useAutoDismiss(successMsg, setSuccessMsg);
  useAutoDismiss(errorMsg, setErrorMsg);
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string }>>([]);
  const [pharmacyPickerOpen, setPharmacyPickerOpen] = useState(false);
  const pharmacyPickerRef = useRef<HTMLDivElement | null>(null);

  const role = session?.user?.role || '';
  const isSales = ['sales_rep', 'sales_manager'].includes(role);
  const isProvider = role === 'provider';
  const isReadOnly = isSales || isProvider;

  useEffect(() => {
    if (status !== 'authenticated') return;

    const role = session?.user?.role;
    const canViewClinics = role === 'admin' || role === 'provider' || role === 'sales_rep' || role === 'sales_manager';
    if (!canViewClinics) {
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

  useEffect(() => {
    if (role !== 'admin') return;
    fetch('/api/users?role=sales_rep')
      .then((res) => res.json())
      .then((data) => setSalesReps(data.users || []))
      .catch(() => setSalesReps([]));

    fetch('/api/pharmacies')
      .then((res) => res.json())
      .then((data) => setPharmacies((data.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => setPharmacies([]));
  }, [role]);

  useEffect(() => {
    if (!pharmacyPickerOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!pharmacyPickerRef.current) return;
      if (!pharmacyPickerRef.current.contains(event.target as Node)) {
        setPharmacyPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [pharmacyPickerOpen]);

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
      setPharmacyPickerOpen(false);
      fetchData();
    } catch { setErrorMsg('Failed to save'); } finally { setSubmitting(false); }
  };

  const filtered = clinics.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col page-wrap pt-6">
      <div className="panel px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />Clinics
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{clinics.length} registered clinics</p>
          </div>
          {!isReadOnly && (
            <button onClick={() => { setEditItem(null); setForm(emptyForm); setPharmacyPickerOpen(false); setShowForm(true); }} className="modern-button-primary">
              <Plus className="h-4 w-4" />Add Clinic
            </button>
          )}
        </div>
        {successMsg && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}<button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
        {errorMsg && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm"><AlertCircle className="h-4 w-4 text-red-600" />{errorMsg}<button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
      </div>

      <div className="flex flex-1 overflow-hidden panel mt-4">
        <div className={`${selected ? 'w-1/2' : 'flex-1'} flex flex-col bg-white border-r border-slate-200 overflow-hidden rounded-l-2xl`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} className="modern-input pl-9" /></div>
          </div>
          {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div> :
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} className={`w-full text-left px-4 py-3.5 hover:bg-blue-50/40 transition ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
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
          <div className="w-1/2 bg-white overflow-y-auto p-6 rounded-r-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-lg">{selected.name}</h2>
              <div className="flex gap-2">
                {!isReadOnly && (
                  <button onClick={() => { setEditItem(selected); setForm({ name: selected.name, address: selected.address || '', phone: selected.phone || '', email: selected.email || '', status: selected.status, salesRepId: selected.salesRepId || '', pharmacyIds: (selected.pharmacies || []).map((cp) => cp.pharmacyId) }); setPharmacyPickerOpen(false); setShowForm(true); }} className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Edit</button>
                )}
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              {selected.phone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selected.phone}</p>}
              {selected.email && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selected.email}</p>}
              {selected.address && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selected.address}</p>}
              {selected._count && <p className="text-sm text-slate-600">{selected._count.patients} patients • {selected._count.prescriptions} prescriptions</p>}
              {role === 'admin' && selected.pharmacies && selected.pharmacies.length > 0 && (
                <p className="text-sm text-slate-600">Pharmacies: {selected.pharmacies.map((cp) => cp.pharmacy?.name || cp.pharmacyId).join(', ')}</p>
              )}
            </div>          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between"><h2 className="font-bold text-slate-900">{editItem ? 'Edit Clinic' : 'Add Clinic'}</h2><button onClick={() => { setShowForm(false); setPharmacyPickerOpen(false); }}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="field-label">Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field-input" /></div>
              <div><label className="field-label">Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="field-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="field-input" /></div>
                <div><label className="field-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field-input" /></div>
              </div>
              <div><label className="field-label">Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="field-input"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              {role === 'admin' && (
                <div>
                  <label className="field-label">Sales Rep Assignment</label>
                  <select
                    value={form.salesRepId}
                    onChange={(e) => setForm((f) => ({ ...f, salesRepId: e.target.value }))}
                    className="field-input"
                  >
                    <option value="">Unassigned (House Clinic)</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>{rep.name} ({rep.email})</option>
                    ))}
                  </select>
                </div>
              )}
              {role === 'admin' && (
                <div className="relative" ref={pharmacyPickerRef}>
                  <label className="field-label">Assigned Pharmacies</label>
                  <button
                    type="button"
                    onClick={() => setPharmacyPickerOpen((v) => !v)}
                    className="field-input text-left flex items-center justify-between"
                  >
                    <span className="truncate">
                      {form.pharmacyIds.length === 0
                        ? 'Select pharmacies...'
                        : `${form.pharmacyIds.length} selected`}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition ${pharmacyPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {form.pharmacyIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.pharmacyIds.map((id) => {
                        const name = pharmacies.find((p) => p.id === id)?.name || id;
                        return (
                          <span key={id} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {name}
                            <button
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, pharmacyIds: f.pharmacyIds.filter((x) => x !== id) }))}
                              className="hover:text-blue-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {pharmacyPickerOpen && (
                    <div className="absolute z-10 mt-2 w-full max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1">
                      {pharmacies.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate-500">No pharmacies available</p>
                      ) : (
                        pharmacies.map((p) => {
                          const checked = form.pharmacyIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  pharmacyIds: checked
                                    ? f.pharmacyIds.filter((id) => id !== p.id)
                                    : [...f.pharmacyIds, p.id],
                                }));
                              }}
                              className="w-full px-3 py-2 text-sm rounded-md hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span>{p.name}</span>
                              {checked && <Check className="h-4 w-4 text-blue-600" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowForm(false); setPharmacyPickerOpen(false); }} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`.field-label{display:block;font-size:.8125rem;font-weight:500;color:#475569;margin-bottom:.375rem}.field-input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.625rem .75rem;font-size:.875rem;outline:none;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}.field-input:focus{box-shadow:0 0 0 4px rgba(59,130,246,.14);border-color:#3b82f6}`}</style>
    </div>
  );
}
