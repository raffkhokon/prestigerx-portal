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
} from 'lucide-react';
import PrescriptionCard from '@/components/PrescriptionCard';
import PrescriptionDetails from '@/components/PrescriptionDetails';
import SlideOver from '@/components/SlideOver';
import { TableSkeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';

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
  patientDob?: string;
  patientGender?: string;
  patientAllergies?: string;
  medicationName?: string;
  medicationStrength?: string;
  medicationForm?: string;
  quantity: number;
  refills?: number;
  writtenDate?: string;
  orderStatus: string;
  paymentStatus: string;
  pharmacyId?: string;
  pharmacyName?: string;
  clinicName?: string;
  clinicId?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  directions?: string;
  providerName?: string;
  providerNpi?: string;
  providerPhone?: string;
  providerDea?: string;
  providerLicense?: string;
  providerPractice?: string;
  providerId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  statusHistory?: any[];
}

const FORM_STEPS = ['Patient', 'Medication', 'Provider', 'Pharmacy', 'Review'];

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

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Prescriptions
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {pagination.total} total prescriptions
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

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex gap-3">
        <div className="relative flex-1 max-w-md">
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

      {/* Prescription Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredPrescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No prescriptions found</p>
            <p className="text-sm mt-1">Submit your first prescription to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPrescriptions.map((rx) => (
                <PrescriptionCard
                  key={rx.id}
                  prescription={rx}
                  onClick={() => setSelectedRx(rx)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => fetchPrescriptions(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchPrescriptions(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-Over for Prescription Details */}
      {selectedRx && (
        <SlideOver
          isOpen={!!selectedRx}
          onClose={() => setSelectedRx(null)}
          title="Prescription Details"
        >
          <PrescriptionDetails prescription={selectedRx} />
        </SlideOver>
      )}

      {/* TODO: Add the create prescription form modal here */}
      {/* (keeping the existing multi-step form logic) */}
    </div>
  );
}
