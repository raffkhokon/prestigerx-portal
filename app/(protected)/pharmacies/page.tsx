'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, Plus, Search, Loader2, X, CheckCircle2, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  type: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  supportedMedications: string[];
  createdAt: string;
}

const emptyForm = {
  name: '',
  type: 'compounding',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  supportedMedications: [] as string[],
  status: 'active',
};

export default function PharmaciesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Pharmacy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [medInput, setMedInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedItem, setSelectedItem] = useState<Pharmacy | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacies');
      const data = await res.json();
      setPharmacies(data.data || []);
    } catch {
      setErrorMsg('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setMedInput('');
    setShowForm(true);
  };

  const openEdit = (item: Pharmacy) => {
    setEditItem(item);
    setForm({
      name: item.name,
      type: item.type,
      contactName: item.contactName || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      supportedMedications: item.supportedMedications || [],
      status: item.status,
    });
    setMedInput('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { setErrorMsg('Pharmacy name is required'); return; }
    setSubmitting(true);
    try {
      const url = editItem ? `/api/pharmacies/${editItem.id}` : '/api/pharmacies';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccessMsg(editItem ? 'Pharmacy updated!' : 'Pharmacy added!');
      setShowForm(false);
      fetchData();
    } catch {
      setErrorMsg('Failed to save pharmacy');
    } finally {
      setSubmitting(false);
    }
  };

  const addMed = () => {
    if (!medInput.trim()) return;
    setForm((f) => ({ ...f, supportedMedications: [...f.supportedMedications, medInput.trim()] }));
    setMedInput('');
  };

  const removeMed = (idx: number) => {
    setForm((f) => ({ ...f, supportedMedications: f.supportedMedications.filter((_, i) => i !== idx) }));
  };

  const filtered = pharmacies.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.contactName?.toLowerCase().includes(q);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Pharmacies
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{pharmacies.length} compounding pharmacies</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
              <Plus className="h-4 w-4" />
              Add Pharmacy
            </button>
          )}
        </div>
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />{errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${selectedItem ? 'w-1/2' : 'flex-1'} flex flex-col bg-white border-r border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Building2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No pharmacies found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setSelectedItem(selectedItem?.id === p.id ? null : p)} className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition ${selectedItem?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{p.contactName || 'No contact'} • {p.type}</p>
                      {p.supportedMedications?.length > 0 && (
                        <p className="text-slate-400 text-xs mt-0.5">{p.supportedMedications.slice(0, 3).join(', ')}{p.supportedMedications.length > 3 && ` +${p.supportedMedications.length - 3} more`}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="w-1/2 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-lg">{selectedItem.name}</h2>
                <div className="flex gap-2">
                  {isAdmin && <button onClick={() => openEdit(selectedItem)} className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Edit</button>}
                  <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  {selectedItem.contactName && <p className="text-sm text-slate-700">{selectedItem.contactName}</p>}
                  {selectedItem.phone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selectedItem.phone}</p>}
                  {selectedItem.email && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selectedItem.email}</p>}
                  {selectedItem.address && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selectedItem.address}</p>}
                </div>
                {selectedItem.supportedMedications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Supported Medications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.supportedMedications.map((med) => (
                        <span key={med} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{med}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{editItem ? 'Edit Pharmacy' : 'Add Pharmacy'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="field-label">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="field-input">
                    <option value="compounding">Compounding</option>
                    <option value="retail">Retail</option>
                    <option value="specialty">Specialty</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="field-input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Contact Name</label>
                <input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} className="field-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field-input" />
                </div>
              </div>
              <div>
                <label className="field-label">Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="field-input" />
              </div>
              <div>
                <label className="field-label">Supported Medications</label>
                <div className="flex gap-2">
                  <input value={medInput} onChange={(e) => setMedInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMed()} className="field-input flex-1" placeholder="Add medication..." />
                  <button onClick={addMed} className="bg-blue-100 text-blue-700 px-3 rounded-lg text-sm font-medium hover:bg-blue-200 transition">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.supportedMedications.map((med, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {med}
                      <button onClick={() => removeMed(i)} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editItem ? 'Update' : 'Add Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .field-label { display: block; font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .field-input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }
      `}</style>
    </div>
  );
}
