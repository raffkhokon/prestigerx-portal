'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  Clock,
} from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  allergies?: string;
  phone?: string;
  email?: string;
}

interface Pharmacy {
  id: string;
  name: string;
  supportedMedications: string[];
}

interface Prescription {
  id: string;
  patientName: string;
  patientId: string;
  medicationName?: string;
  medicationStrength?: string;
  medicationForm?: string;
  quantity: number;
  orderStatus: string;
  paymentStatus: string;
  pharmacyName?: string;
  clinicName?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  directions?: string;
  providerName?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
}

const FORM_STEPS = ['Patient', 'Medication', 'Provider', 'Pharmacy', 'Review'];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  processing: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  shipped: <Truck className="h-3.5 w-3.5" />,
  delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelled: <X className="h-3.5 w-3.5" />,
};

export default function PrescriptionsPage() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Form state
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientDob: '',
    patientGender: '',
    patientAllergies: '',
    medicationName: '',
    medicationStrength: '',
    medicationForm: '',
    quantity: 1,
    directions: '',
    refills: 0,
    writtenDate: '',
    daw: false,
    providerName: '',
    providerNpi: '',
    providerPhone: '',
    providerDea: '',
    providerLicense: '',
    providerPractice: '',
    pharmacyId: '',
    pharmacyName: '',
    shippingMethod: 'ship_to_patient',
    amount: 0,
    clinicName: session?.user?.clinicName || '',
    clinicId: session?.user?.clinicId || '',
  });

  const fetchPrescriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/prescriptions?${params}`);
      const data = await res.json();
      setPrescriptions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
    } catch {
      setErrorMsg('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchPatients = useCallback(async () => {
    const res = await fetch('/api/patients?limit=100');
    const data = await res.json();
    setPatients(data.data || []);
  }, []);

  const fetchPharmacies = useCallback(async () => {
    const res = await fetch('/api/pharmacies');
    const data = await res.json();
    setPharmacies(data.data || []);
  }, []);

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchPharmacies();
  }, [fetchPrescriptions, fetchPatients, fetchPharmacies]);

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setForm((f) => ({
        ...f,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientDob: patient.dateOfBirth || '',
        patientGender: patient.gender || '',
        patientAllergies: patient.allergies || '',
      }));
    }
  };

  const handlePharmacySelect = (pharmacyId: string) => {
    const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
    if (pharmacy) {
      setForm((f) => ({
        ...f,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
      }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clinicId: session?.user?.clinicId,
          clinicName: session?.user?.clinicName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }
      setSuccessMsg('Prescription submitted successfully!');
      setShowForm(false);
      setStep(0);
      resetForm();
      fetchPrescriptions();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      patientId: '',
      patientName: '',
      patientDob: '',
      patientGender: '',
      patientAllergies: '',
      medicationName: '',
      medicationStrength: '',
      medicationForm: '',
      quantity: 1,
      directions: '',
      refills: 0,
      writtenDate: '',
      daw: false,
      providerName: '',
      providerNpi: '',
      providerPhone: '',
      providerDea: '',
      providerLicense: '',
      providerPractice: '',
      pharmacyId: '',
      pharmacyName: '',
      shippingMethod: 'ship_to_patient',
      amount: 0,
      clinicName: session?.user?.clinicName || '',
      clinicId: session?.user?.clinicId || '',
    });
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      rx.patientName?.toLowerCase().includes(q) ||
      rx.medicationName?.toLowerCase().includes(q) ||
      rx.id.toLowerCase().includes(q)
    );
  });

  const updateStatus = async (id: string, orderStatus: string) => {
    try {
      await fetch(`/api/prescriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus }),
      });
      fetchPrescriptions();
      if (selectedRx?.id === id) {
        setSelectedRx((rx) => rx ? { ...rx, orderStatus } : rx);
      }
    } catch {
      setErrorMsg('Failed to update status');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Prescriptions
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {pagination.total} total • Multi-step prescription submission
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setStep(0); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus className="h-4 w-4" />
            New Prescription
          </button>
        </div>

        {/* Success/Error banners */}
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto text-green-600 hover:text-green-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-600 hover:text-red-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List Panel */}
        <div className={`${selectedRx ? 'w-1/2' : 'flex-1'} flex flex-col border-r border-slate-200 bg-white overflow-hidden transition-all`}>
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient, medication, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchPrescriptions(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No prescriptions found</p>
              <p className="text-sm mt-1">Submit your first prescription to get started</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredPrescriptions.map((rx) => (
                <button
                  key={rx.id}
                  onClick={() => setSelectedRx(selectedRx?.id === rx.id ? null : rx)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition ${selectedRx?.id === rx.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">{rx.patientName}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(rx.orderStatus)}`}>
                          {STATUS_ICONS[rx.orderStatus]}
                          {rx.orderStatus}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-0.5">
                        {rx.medicationName || 'No medication'} {rx.medicationStrength && `• ${rx.medicationStrength}`}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {rx.pharmacyName || 'No pharmacy'} • {formatDate(rx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900">${rx.amount.toFixed(2)}</p>
                      <span className={`text-xs ${getStatusColor(rx.paymentStatus)}`}>
                        {rx.paymentStatus}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => fetchPrescriptions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchPrescriptions(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRx && (
          <div className="w-1/2 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-900 text-lg">Prescription Details</h2>
                <button onClick={() => setSelectedRx(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Status */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedRx.id, s)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${
                          selectedRx.orderStatus === s
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient */}
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Patient</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <InfoRow label="Name" value={selectedRx.patientName} />
                    <InfoRow label="DOB" value={selectedRx.patientDob} />
                    <InfoRow label="Gender" value={selectedRx.patientGender} />
                    <InfoRow label="Allergies" value={selectedRx.patientAllergies || 'None'} />
                  </div>
                </section>

                {/* Medication */}
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Medication</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <InfoRow label="Name" value={selectedRx.medicationName} />
                    <InfoRow label="Strength" value={selectedRx.medicationStrength} />
                    <InfoRow label="Form" value={selectedRx.medicationForm} />
                    <InfoRow label="Quantity" value={String(selectedRx.quantity)} />
                    <InfoRow label="Directions" value={selectedRx.directions} />
                  </div>
                </section>

                {/* Provider */}
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Provider</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <InfoRow label="Name" value={selectedRx.providerName} />
                  </div>
                </section>

                {/* Fulfillment */}
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fulfillment</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <InfoRow label="Pharmacy" value={selectedRx.pharmacyName} />
                    <InfoRow label="Shipping" value={selectedRx.shippingMethod} />
                    <InfoRow label="Tracking" value={selectedRx.trackingNumber} />
                    <InfoRow label="Carrier" value={selectedRx.trackingCarrier} />
                  </div>
                </section>

                {/* Billing */}
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Billing</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <InfoRow label="Amount" value={`$${selectedRx.amount.toFixed(2)}`} />
                    <InfoRow label="Payment Status" value={selectedRx.paymentStatus} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Step Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">New Prescription</h2>
                <p className="text-slate-500 text-sm">Step {step + 1} of {FORM_STEPS.length}: {FORM_STEPS[step]}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-5 py-3 border-b border-slate-100 flex gap-1">
              {FORM_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i <= step ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Step 0: Patient */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Select Patient *
                    </label>
                    <select
                      value={form.patientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a patient...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.patientId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1.5 text-sm">
                      <InfoRow label="Name" value={form.patientName} />
                      <InfoRow label="DOB" value={form.patientDob} />
                      <InfoRow label="Gender" value={form.patientGender} />
                      <InfoRow label="Allergies" value={form.patientAllergies || 'None'} />
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Medication */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Medication Name *" required>
                    <input
                      type="text"
                      value={form.medicationName}
                      onChange={(e) => setForm((f) => ({ ...f, medicationName: e.target.value }))}
                      placeholder="e.g., Semaglutide"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Strength">
                    <input
                      type="text"
                      value={form.medicationStrength}
                      onChange={(e) => setForm((f) => ({ ...f, medicationStrength: e.target.value }))}
                      placeholder="e.g., 0.5mg/mL"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Form">
                    <select
                      value={form.medicationForm}
                      onChange={(e) => setForm((f) => ({ ...f, medicationForm: e.target.value }))}
                      className="form-input"
                    >
                      <option value="">Select form...</option>
                      <option value="injection">Injection</option>
                      <option value="capsule">Capsule</option>
                      <option value="tablet">Tablet</option>
                      <option value="cream">Cream</option>
                      <option value="gel">Gel</option>
                      <option value="solution">Solution</option>
                      <option value="troche">Troche</option>
                      <option value="patch">Patch</option>
                      <option value="nasal_spray">Nasal Spray</option>
                    </select>
                  </FormField>
                  <FormField label="Quantity">
                    <input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Refills">
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={form.refills}
                      onChange={(e) => setForm((f) => ({ ...f, refills: parseInt(e.target.value) || 0 }))}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Written Date">
                    <input
                      type="date"
                      value={form.writtenDate}
                      onChange={(e) => setForm((f) => ({ ...f, writtenDate: e.target.value }))}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Directions" className="col-span-2">
                    <textarea
                      value={form.directions}
                      onChange={(e) => setForm((f) => ({ ...f, directions: e.target.value }))}
                      rows={3}
                      placeholder="Sig/directions..."
                      className="form-input resize-none"
                    />
                  </FormField>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="daw"
                      checked={form.daw}
                      onChange={(e) => setForm((f) => ({ ...f, daw: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="daw" className="text-sm text-slate-700">
                      DAW (Dispense as Written)
                    </label>
                  </div>
                </div>
              )}

              {/* Step 2: Provider */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Provider Name *" required>
                    <input
                      type="text"
                      value={form.providerName}
                      onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                      placeholder="Dr. Jane Smith"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="NPI Number">
                    <input
                      type="text"
                      value={form.providerNpi}
                      onChange={(e) => setForm((f) => ({ ...f, providerNpi: e.target.value }))}
                      placeholder="1234567890"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Phone">
                    <input
                      type="tel"
                      value={form.providerPhone}
                      onChange={(e) => setForm((f) => ({ ...f, providerPhone: e.target.value }))}
                      placeholder="(555) 000-0000"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="DEA Number">
                    <input
                      type="text"
                      value={form.providerDea}
                      onChange={(e) => setForm((f) => ({ ...f, providerDea: e.target.value }))}
                      placeholder="AA1234567"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="License Number">
                    <input
                      type="text"
                      value={form.providerLicense}
                      onChange={(e) => setForm((f) => ({ ...f, providerLicense: e.target.value }))}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Practice Name">
                    <input
                      type="text"
                      value={form.providerPractice}
                      onChange={(e) => setForm((f) => ({ ...f, providerPractice: e.target.value }))}
                      className="form-input"
                    />
                  </FormField>
                </div>
              )}

              {/* Step 3: Pharmacy */}
              {step === 3 && (
                <div className="space-y-4">
                  <FormField label="Select Pharmacy *" required>
                    <select
                      value={form.pharmacyId}
                      onChange={(e) => handlePharmacySelect(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Choose a pharmacy...</option>
                      {pharmacies.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Shipping Method">
                    <select
                      value={form.shippingMethod}
                      onChange={(e) => setForm((f) => ({ ...f, shippingMethod: e.target.value }))}
                      className="form-input"
                    >
                      <option value="ship_to_patient">Ship to Patient</option>
                      <option value="ship_to_clinic">Ship to Clinic</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </FormField>
                  <FormField label="Amount ($)">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      className="form-input"
                    />
                  </FormField>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Review Prescription
                    </p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Patient</p>
                        <p className="text-slate-800">{form.patientName} • {form.patientDob}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Medication</p>
                        <p className="text-slate-800">{form.medicationName} {form.medicationStrength} • {form.medicationForm} • Qty: {form.quantity}</p>
                        {form.directions && <p className="text-slate-600 mt-0.5">{form.directions}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Provider</p>
                        <p className="text-slate-800">{form.providerName} {form.providerNpi && `• NPI: ${form.providerNpi}`}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Pharmacy & Shipping</p>
                        <p className="text-slate-800">{form.pharmacyName} • {form.shippingMethod}</p>
                        {form.amount > 0 && <p className="text-slate-800 font-semibold">${form.amount.toFixed(2)}</p>}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    🔒 All PHI will be encrypted with AES-256-GCM before storage
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-slate-500 text-sm hover:text-slate-700 transition"
              >
                Cancel
              </button>
              {step < FORM_STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 0 && !form.patientId}
                  className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.patientId || !form.medicationName}
                  className="ml-auto flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Submitting...' : 'Submit Prescription'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: box-shadow 0.15s;
        }
        .form-input:focus {
          box-shadow: 0 0 0 2px #3b82f6;
          border-color: transparent;
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-500 w-20 flex-shrink-0">{label}:</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
