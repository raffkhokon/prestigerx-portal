'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Users, Plus, Search, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  allergies?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  clinicName?: string;
  consentGiven: boolean;
  createdAt: string;
}

const emptyForm = {
  clinicId: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  email: '',
  allergies: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  consentGiven: false,
};

export default function PatientsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients?limit=100', { cache: 'no-store' });
      const data = await res.json();
      const nextPatients = data.data || [];
      setPatients(nextPatients);

      // Keep detail panel in sync with freshest row data
      setSelectedPatient((prev) => {
        if (!prev) return prev;
        return nextPatients.find((p: Patient) => p.id === prev.id) || prev;
      });
    } catch {
      setErrorMsg('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (session?.user?.role !== 'admin') return;
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((data) => setClinics((data.data || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      openCreate();
    }
  }, [searchParams]);

  const openCreate = () => {
    setEditPatient(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (patient: Patient) => {
    setEditPatient(patient);
    setForm({
      clinicId: '',
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      allergies: patient.allergies || '',
      streetAddress: patient.streetAddress || '',
      city: patient.city || '',
      state: patient.state || '',
      zipCode: patient.zipCode || '',
      consentGiven: patient.consentGiven,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName) {
      setErrorMsg('First and last name are required');
      return;
    }

    if (!editPatient && session?.user?.role === 'admin' && !form.clinicId) {
      setErrorMsg('Please select a clinic');
      return;
    }

    setSubmitting(true);
    try {
      const url = editPatient ? `/api/patients/${editPatient.id}` : '/api/patients';
      const method = editPatient ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save patient');
      }

      setSuccessMsg(editPatient ? 'Patient updated successfully!' : 'Patient created successfully!');
      setShowForm(false);
      fetchPatients();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to save patient');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Patients
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{patients.length} patients registered</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus className="h-4 w-4" />
            Add Patient
          </button>
        </div>
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={`${selectedPatient ? 'w-1/2' : 'flex-1'} flex flex-col bg-white border-r border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No patients found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Clinic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className={`cursor-pointer hover:bg-slate-50 transition ${selectedPatient?.id === p.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.dateOfBirth || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.email || p.phone || 'No contact info'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.clinicName || session?.user?.clinicName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedPatient && (
          <div className="w-1/2 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-lg">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(selectedPatient)}
                    className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <InfoSection title="Personal Info">
                  <InfoRow label="DOB" value={selectedPatient.dateOfBirth} />
                  <InfoRow label="Gender" value={selectedPatient.gender} />
                  <InfoRow label="Allergies" value={selectedPatient.allergies || 'None known'} />
                </InfoSection>
                <InfoSection title="Contact">
                  <InfoRow label="Phone" value={selectedPatient.phone} />
                  <InfoRow label="Email" value={selectedPatient.email} />
                </InfoSection>
                <InfoSection title="Address">
                  <InfoRow label="Street" value={selectedPatient.streetAddress} />
                  <InfoRow label="City" value={selectedPatient.city} />
                  <InfoRow label="State" value={selectedPatient.state} />
                  <InfoRow label="ZIP" value={selectedPatient.zipCode} />
                </InfoSection>
                <InfoSection title="Clinic">
                  <InfoRow label="Clinic" value={selectedPatient.clinicName || session?.user?.clinicName} />
                  <InfoRow label="Consent" value={selectedPatient.consentGiven ? 'Given ✓' : 'Not given'} />
                  <InfoRow label="Added" value={formatDate(selectedPatient.createdAt)} />
                </InfoSection>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{editPatient ? 'Edit Patient' : 'Add Patient'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4">
                {session?.user?.role === 'admin' && !editPatient && (
                  <div className="col-span-2">
                    <label className="field-label">Clinic *</label>
                    <select
                      value={form.clinicId}
                      onChange={(e) => setForm((f) => ({ ...f, clinicId: e.target.value }))}
                      className="field-input"
                    >
                      <option value="">Select clinic...</option>
                      {clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="field-label">First Name *</label>
                  <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="field-input" placeholder="Jane" />
                </div>
                <div>
                  <label className="field-label">Last Name *</label>
                  <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="field-input" placeholder="Doe" />
                </div>
                <div>
                  <label className="field-label">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Gender</label>
                  <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="field-input">
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="field-input" placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field-input" placeholder="jane@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Allergies</label>
                  <input value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} className="field-input" placeholder="Penicillin, Sulfa drugs..." />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Street Address</label>
                  <input value={form.streetAddress} onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">City</label>
                  <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">State</label>
                  <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="field-input" placeholder="FL" maxLength={2} />
                </div>
                <div>
                  <label className="field-label">ZIP Code</label>
                  <input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} className="field-input" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="consent" checked={form.consentGiven} onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))} className="rounded" />
                  <label htmlFor="consent" className="text-sm text-slate-700">Patient consent given</label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editPatient ? 'Update Patient' : 'Add Patient'}
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

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{title}</p>
      <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-500 w-16 flex-shrink-0">{label}:</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
