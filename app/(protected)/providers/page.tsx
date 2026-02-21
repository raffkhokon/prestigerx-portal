'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Hospital, Plus, Search, Loader2, X, CheckCircle2 } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  email?: string;
  npi?: string;
  license?: string;
  phone?: string;
  practice?: string;
  createdAt: string;
  clinics?: Array<{ clinic: { id: string; name: string } }>;
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  npi: '',
  license: '',
  phone: '',
  practice: '',
};

export default function ProvidersPage() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [assigningClinicId, setAssigningClinicId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.data || []);
    } catch { setErrorMsg('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.name) { setErrorMsg('Name required'); return; }
    if (!form.email) { setErrorMsg('Email required'); return; }
    if (!form.password || form.password.length < 8) { setErrorMsg('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save provider');
      setSuccessMsg('Provider added!');
      setShowForm(false);
      setForm(emptyForm);
      fetchData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const openAssignModal = async (provider: Provider) => {
    setSelectedProvider(provider);
    setShowAssignModal(true);

    if (clinics.length === 0) {
      try {
        const res = await fetch('/api/clinics');
        const data = await res.json();
        setClinics((data.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      } catch {
        setErrorMsg('Failed to load clinics');
      }
    }
  };

  const refreshSelectedProvider = async () => {
    if (!selectedProvider) return;
    const refreshedRes = await fetch('/api/providers');
    const refreshedData = await refreshedRes.json();
    const updatedProvider = (refreshedData.data || []).find((p: Provider) => p.id === selectedProvider.id);
    if (updatedProvider) setSelectedProvider(updatedProvider);
  };

  const handleAssignClinic = async (clinicId: string) => {
    if (!selectedProvider) return;
    setAssigningClinicId(clinicId);
    try {
      const res = await fetch(`/api/providers/${selectedProvider.id}/clinics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign clinic');

      setSuccessMsg('Provider assigned to clinic');
      await fetchData();
      await refreshSelectedProvider();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to assign clinic');
    } finally {
      setAssigningClinicId(null);
    }
  };

  const handleUnassignClinic = async (clinicId: string) => {
    if (!selectedProvider) return;
    setAssigningClinicId(clinicId);
    try {
      const res = await fetch(`/api/providers/${selectedProvider.id}/clinics`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unassign clinic');

      setSuccessMsg('Provider unassigned from clinic');
      await fetchData();
      await refreshSelectedProvider();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to unassign clinic');
    } finally {
      setAssigningClinicId(null);
    }
  };

  const filtered = providers.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.npi?.includes(search));

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Hospital className="h-5 w-5 text-blue-600" />Providers</h1>
            <p className="text-slate-500 text-sm mt-0.5">{providers.length} providers</p>
          </div>
          <button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            <Plus className="h-4 w-4" />Add Provider
          </button>
        </div>
        {successMsg && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}<button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
        {errorMsg && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm flex items-center gap-2">{errorMsg}<button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button></div>}
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search by name or NPI..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>

        {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div> :
          filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Hospital className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No providers found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Name', 'Email', 'NPI', 'License', 'Phone', 'Practice', 'Clinics', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.npi || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.license || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.practice || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.clinics && p.clinics.length > 0 ? p.clinics.map((pc) => pc.clinic.name).join(', ') : 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openAssignModal(p)}
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
                        >
                          Assign Clinic
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
            <div className="p-5 border-b flex items-center justify-between"><h2 className="font-bold text-slate-900">Add Provider</h2><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              {[
                ['Name *', 'name', 'text', 'Dr. Jane Smith'],
                ['Email *', 'email', 'email', 'doctor@clinic.com'],
                ['Password *', 'password', 'password', 'At least 8 characters'],
                ['NPI Number', 'npi', 'text', '1234567890'],
                ['License', 'license', 'text', ''],
                ['Phone', 'phone', 'tel', ''],
                ['Practice', 'practice', 'text', ''],
              ].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label className="field-label">{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="field-input" placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Add Provider</button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Assign Clinics • {selectedProvider.name}</h2>
              <button onClick={() => setShowAssignModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {clinics.length === 0 ? (
                <p className="text-sm text-slate-500">No clinics available.</p>
              ) : clinics.map((clinic) => {
                const isAssigned = !!selectedProvider.clinics?.some((pc) => pc.clinic.id === clinic.id);
                return (
                  <div key={clinic.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{clinic.name}</p>
                      <p className="text-xs text-slate-500">{isAssigned ? 'Already assigned' : 'Not assigned'}</p>
                    </div>
                    {isAssigned ? (
                      <button
                        disabled={assigningClinicId === clinic.id}
                        onClick={() => handleUnassignClinic(clinic.id)}
                        className="text-xs bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        {assigningClinicId === clinic.id ? 'Removing...' : 'Unassign'}
                      </button>
                    ) : (
                      <button
                        disabled={assigningClinicId === clinic.id}
                        onClick={() => handleAssignClinic(clinic.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        {assigningClinicId === clinic.id ? 'Assigning...' : 'Assign'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`.field-label{display:block;font-size:.8125rem;font-weight:500;color:#374151;margin-bottom:.375rem}.field-input{width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.field-input:focus{box-shadow:0 0 0 2px #3b82f6;border-color:transparent}`}</style>
    </div>
  );
}
