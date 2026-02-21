'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  FileText,
  ExternalLink,
  Eye,
  FileDown,
  MoreVertical,
  ChevronDown,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import PrescriptionDetails from '@/components/PrescriptionDetails';
import SlideOver from '@/components/SlideOver';
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
  orderStatus: string;
  paymentStatus: string;
  pharmacyName?: string;
  clinicName?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  directions?: string;
  providerName?: string;
  providerNpi?: string;
  providerPhone?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  statusHistory?: any[];
}

export default function PrescriptionsPage() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [medicationFilter, setMedicationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [shippingFilter, setShippingFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchPrescriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: '50',
        sort: sortColumn,
        order: sortDirection,
      });
      if (search) params.set('search', search);
      if (medicationFilter) params.set('medication', medicationFilter);
      if (statusFilter) params.set('paymentStatus', statusFilter);
      if (orderStatusFilter) params.set('orderStatus', orderStatusFilter);
      if (shippingFilter) params.set('shipping', shippingFilter);
      
      const res = await fetch(`/api/prescriptions?${params}`);
      const data = await res.json();
      setPrescriptions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [search, medicationFilter, statusFilter, orderStatusFilter, shippingFilter, sortColumn, sortDirection]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPrescriptions(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchPrescriptions]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
      : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date: dateStr, time: timeStr };
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prescription History</h1>
            <p className="text-slate-500 text-sm mt-1">Search your prescription records</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition">
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, medication, provider, or prescription ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <FilterDropdown
            icon="📦"
            label="Filter by Order Status"
            value={orderStatusFilter}
            onChange={setOrderStatusFilter}
            options={[
              { value: '', label: 'All Order Status' },
              { value: 'received', label: 'Received' },
              { value: 'processed', label: 'Processed' },
              { value: 'need_clarification', label: 'Need Clarification' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <FilterDropdown
            icon="💳"
            label="Filter by Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'paid', label: 'Payment Successful' },
              { value: 'failed', label: 'Payment Failed' },
              { value: 'cancelled_by_prescriber', label: 'Cancelled by Prescriber' },
            ]}
          />
          <FilterDropdown
            icon="🚚"
            label="Filter by Shipping"
            value={shippingFilter}
            onChange={setShippingFilter}
            options={[
              { value: '', label: 'All Shipping' },
              { value: 'ship_to_clinic', label: 'Ship to Clinic' },
              { value: 'ship_to_patient', label: 'Ship to Patient' },
            ]}
          />
          <div className="ml-auto text-sm text-slate-600">
            Total: <span className="font-semibold">{pagination.total}</span>
          </div>
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
            <thead className="bg-white border-b border-slate-200 sticky top-0">
              <tr>
                <SortableHeader label="Date" column="createdAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <SortableHeader label="Patient" column="patientName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <SortableHeader label="Medication" column="medicationName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <SortableHeader label="Status" column="paymentStatus" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <SortableHeader label="Order Status" column="orderStatus" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <SortableHeader label="Tracking" column="trackingNumber" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} getSortIcon={getSortIcon} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.map((rx) => {
                const { date, time } = formatDateTime(rx.createdAt);
                const trackingUrl = getTrackingUrl(rx.trackingCarrier, rx.trackingNumber);
                
                return (
                  <tr
                    key={rx.id}
                    className="hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => setSelectedRx(rx)}
                  >
                    {/* Date */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-900">{date}</div>
                      <div className="text-xs text-slate-500">@ {time}</div>
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">{rx.patientName}</div>
                      <div className="text-xs text-slate-500">patient@email.com</div>
                    </td>

                    {/* Medication */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {rx.medicationName?.toUpperCase() || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-600">
                        {rx.medicationStrength} {rx.medicationForm && `(${rx.quantity}${rx.medicationForm})`}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] rounded-full lowercase">
                        {rx.shippingMethod?.replace(/_/g, ' ') || 'ship to patient'}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium ${
                        rx.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-700'
                          : rx.paymentStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {rx.paymentStatus === 'paid' ? 'Payment Successful' : rx.paymentStatus}
                      </span>
                    </td>

                    {/* Order Status */}
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                        rx.orderStatus === 'shipped' 
                          ? 'bg-purple-100 text-purple-700'
                          : rx.orderStatus === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : rx.orderStatus === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {rx.orderStatus}
                      </span>
                    </td>

                    {/* Tracking */}
                    <td className="px-4 py-4">
                      {rx.trackingNumber ? (
                        <div>
                          <div className="text-xs text-slate-600 font-semibold">
                            {rx.trackingCarrier?.toUpperCase() || 'CARRIER'}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-sm text-blue-600 font-mono">
                              {rx.trackingNumber}
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
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRx(rx);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                          title="Download"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                          title="More"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
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
            <span className="px-4 py-2 text-sm text-slate-600">
              Page {pagination.page} of {pagination.pages}
            </span>
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

      {/* Side Panel */}
      {selectedRx && (
        <SlideOver
          isOpen={!!selectedRx}
          onClose={() => setSelectedRx(null)}
          title="Prescription Details"
        >
          <PrescriptionDetails 
            prescription={selectedRx} 
            onUpdate={() => {
              // Refresh the prescriptions list
              fetchPrescriptions(pagination.page);
              // Update the selected prescription to reflect changes
              const updated = prescriptions.find(p => p.id === selectedRx.id);
              if (updated) setSelectedRx(updated);
            }}
          />
        </SlideOver>
      )}
    </div>
  );
}

function FilterDropdown({ 
  icon, 
  label, 
  value, 
  onChange, 
  options 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  options: Array<{ value: string; label: string }>; 
}) {
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  
  return (
    <div className="relative inline-block">
      <label className="absolute -top-1.5 left-2 px-1 bg-white text-[10px] font-medium text-slate-600 z-10">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-2.5 pr-7 py-1.5 border border-slate-300 rounded text-xs appearance-none bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition min-w-[180px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  getSortIcon,
}: {
  label: string;
  column: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  getSortIcon: (column: string) => React.ReactNode;
}) {
  return (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition select-none"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        {getSortIcon(column)}
      </div>
    </th>
  );
}
