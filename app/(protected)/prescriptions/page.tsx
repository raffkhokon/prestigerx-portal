'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  FileText,
  ExternalLink,
  MoreVertical,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import PrescriptionDetails from '@/components/PrescriptionDetails';
import SlideOver from '@/components/SlideOver';
import StatusBadge from '@/components/StatusBadge';
import { TableSkeleton } from '@/components/Skeleton';

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

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PrescriptionsPage() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchPrescriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/prescriptions?${params}`);
      const data = await res.json();
      setPrescriptions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
    } catch {
      setErrorMsg('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPrescriptions(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchPrescriptions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTrackingUrl = (carrier?: string, number?: string) => {
    if (!carrier || !number) return null;
    const carriers: Record<string, string> = {
      ups: `https://www.ups.com/track?tracknum=${number}`,
      usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`,
      fedex: `https://www.fedex.com/fedextrack/?tracknumbers=${number}`,
    };
    return carriers[carrier.toLowerCase()] || null;
  };

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
              {loading ? 'Loading...' : `${pagination.total} total prescriptions`}
            </p>
          </div>
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
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-3 mb-4">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                statusFilter === filter.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, Patient, Clinic, Provider or Medication"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={10} />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No prescriptions found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.map((rx) => {
                const trackingUrl = getTrackingUrl(rx.trackingCarrier, rx.trackingNumber);
                
                return (
                  <tr
                    key={rx.id}
                    onClick={() => setSelectedRx(rx)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {formatDate(rx.createdAt)}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {rx.patientName}
                      </div>
                      {rx.clinicName && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {rx.clinicName}
                        </div>
                      )}
                    </td>

                    {/* Medication */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">
                        {rx.medicationName || 'N/A'}
                      </div>
                      {rx.medicationStrength && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {rx.medicationStrength} • Qty: {rx.quantity}
                        </div>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={rx.paymentStatus} type="payment" />
                    </td>

                    {/* Order Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={rx.orderStatus} type="order" />
                    </td>

                    {/* Tracking */}
                    <td className="px-4 py-3">
                      {rx.trackingNumber ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono text-slate-700">
                            {rx.trackingNumber.slice(0, 12)}...
                          </span>
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRx(rx);
                        }}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {((pagination.page - 1) * 50) + 1}-{Math.min(pagination.page * 50, pagination.total)} of {pagination.total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPrescriptions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-1 px-3">
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.pages}
              </span>
            </div>
            <button
              onClick={() => fetchPrescriptions(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Side Panel for Prescription Details */}
      {selectedRx && (
        <SlideOver
          isOpen={!!selectedRx}
          onClose={() => setSelectedRx(null)}
          title="Prescription Details"
        >
          <PrescriptionDetails prescription={selectedRx} />
        </SlideOver>
      )}
    </div>
  );
}
