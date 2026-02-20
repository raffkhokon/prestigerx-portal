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
import { formatDate } from '@/lib/utils';
import Toast from '@/components/Toast';
import { TableSkeleton } from '@/components/Skeleton';
import PrescriptionCard from '@/components/PrescriptionCard';
import SlideOver from '@/components/SlideOver';
import PrescriptionDetails from '@/components/PrescriptionDetails';

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
  daw?: boolean;
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

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      rx.patientName?.toLowerCase().includes(q) ||
      rx.medicationName?.toLowerCase().includes(q) ||
      rx.providerName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Prescriptions</h1>
        <p className="text-slate-500 text-sm">
          {pagination.total} total prescriptions
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient, medication, or provider..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); fetchPrescriptions(1); }}
          className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setShowForm(true);
            setStep(0);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          New Prescription
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredPrescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <FileText className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No prescriptions found</h3>
          <p className="text-slate-500 text-sm mb-6">
            {search || statusFilter ? 'Try adjusting your filters' : 'Create your first prescription to get started'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => {
                setShowForm(true);
                setStep(0);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Plus className="h-4 w-4" />
              Create Prescription
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                onClick={() => fetchPrescriptions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchPrescriptions(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Slide-Over for Details */}
      <SlideOver
        isOpen={!!selectedRx}
        onClose={() => setSelectedRx(null)}
        title="Prescription Details"
      >
        {selectedRx && <PrescriptionDetails prescription={selectedRx} />}
      </SlideOver>

      {/* Toast Notifications */}
      {successMsg && (
        <Toast
          message={successMsg}
          type="success"
          onClose={() => setSuccessMsg('')}
        />
      )}
      {errorMsg && (
        <Toast
          message={errorMsg}
          type="error"
          onClose={() => setErrorMsg('')}
        />
      )}

      {/* Form Modal - keeping original for now */}
      {/* TODO: Extract form to separate component */}
    </div>
  );
}
