'use client';

import { useState } from 'react';
import StatusBadge from './StatusBadge';
import StatusTimeline from './StatusTimeline';
import { User, Pill, Hospital, Building2, Truck, Calendar, DollarSign, FileText, History, Edit2, Save, X as XIcon, Loader2 } from 'lucide-react';

interface StatusChange {
  id: string;
  statusType: 'order' | 'payment';
  oldStatus?: string;
  newStatus: string;
  changedBy: string;
  changedByName: string;
  changedByRole: string;
  notes?: string;
  createdAt: string;
}

interface PrescriptionDetailsProps {
  prescription: {
    id: string;
    patientName: string;
    patientDob?: string;
    patientGender?: string;
    patientAllergies?: string;
    medicationName?: string;
    medicationStrength?: string;
    medicationForm?: string;
    quantity: number;
    refills?: number;
    directions?: string;
    daw?: boolean;
    writtenDate?: string;
    providerName?: string;
    providerNpi?: string;
    providerPhone?: string;
    providerDea?: string;
    providerLicense?: string;
    providerPractice?: string;
    pharmacyName?: string;
    clinicName?: string;
    shippingMethod?: string;
    shippingRecipientName?: string;
    shippingStreetAddress?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingZipCode?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    orderStatus: string;
    paymentStatus: string;
    amount: number;
    createdAt: string;
    updatedAt: string;
    statusHistory?: StatusChange[];
  };
  onUpdate?: () => void;
  readOnly?: boolean;
}

export default function PrescriptionDetails({ prescription, onUpdate, readOnly = false }: PrescriptionDetailsProps) {
  const [editingStatus, setEditingStatus] = useState(false);

  const shippingAddress = [
    prescription.shippingStreetAddress,
    prescription.shippingCity,
    prescription.shippingState,
    prescription.shippingZipCode,
  ].filter(Boolean).join(', ');
  const [orderStatus, setOrderStatus] = useState(prescription.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState(prescription.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveStatus = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      setEditingStatus(false);
      
      // Update the prescription object locally
      prescription.orderStatus = orderStatus;
      prescription.paymentStatus = paymentStatus;
      
      // Notify parent to refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMsg);
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setOrderStatus(prescription.orderStatus);
    setPaymentStatus(prescription.paymentStatus);
    setEditingStatus(false);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  );

  const Field = ({ label, value }: { label: string; value?: string | number | boolean }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        <span className="text-sm font-semibold text-slate-950 break-words">{value.toString()}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-900">Status</h3>
          {!readOnly && (
            !editingStatus ? (
              <button
                onClick={() => setEditingStatus(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-blue-700 hover:bg-blue-50 font-medium transition"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Status
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveStatus}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg font-medium transition"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            )
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {editingStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Order Status</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="processed">Processed</option>
                <option value="need_clarification">Need Clarification</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="paid">Payment Successful</option>
                <option value="failed">Payment Failed</option>
                <option value="cancelled_by_prescriber">Cancelled by Prescriber</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={orderStatus} type="order" />
            <StatusBadge status={paymentStatus} type="payment" />
          </div>
        )}
      </section>

      {/* Patient Information */}
      <Section icon={User} title="Patient Information">
        <Field label="Name" value={prescription.patientName} />
        <Field label="Date of Birth" value={prescription.patientDob} />
        <Field label="Gender" value={prescription.patientGender} />
        {prescription.patientAllergies && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Allergies:</p>
            <p className="text-sm text-red-900 font-medium">{prescription.patientAllergies}</p>
          </div>
        )}
      </Section>

      {/* Medication Information */}
      <Section icon={Pill} title="Medication">
        <Field label="Medication" value={prescription.medicationName} />
        <Field label="Strength" value={prescription.medicationStrength} />
        <Field label="Form" value={prescription.medicationForm} />
        <Field label="Quantity" value={prescription.quantity} />
        <Field label="Refills" value={prescription.refills} />
        <Field label="DAW" value={prescription.daw ? 'Yes' : 'No'} />
        {prescription.directions && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-1">Directions:</p>
            <p className="text-sm text-blue-950 font-medium">{prescription.directions}</p>
          </div>
        )}
        <Field label="Written Date" value={prescription.writtenDate} />
      </Section>

      {/* Provider Information */}
      <Section icon={Hospital} title="Provider">
        <Field label="Name" value={prescription.providerName} />
        <Field label="NPI" value={prescription.providerNpi} />
        <Field label="Phone" value={prescription.providerPhone} />
        <Field label="DEA" value={prescription.providerDea} />
        <Field label="License" value={prescription.providerLicense} />
        <Field label="Practice" value={prescription.providerPractice} />
      </Section>

      {/* Pharmacy & Shipping */}
      <Section icon={Building2} title="Pharmacy & Shipping">
        <Field label="Pharmacy" value={prescription.pharmacyName} />
        <Field label="Clinic" value={prescription.clinicName} />
        <Field label="Shipping Method" value={prescription.shippingMethod?.replace(/_/g, ' ')} />
        <Field label="Ship To" value={prescription.shippingRecipientName} />
        {shippingAddress && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">Shipping Address:</p>
            <p className="text-sm text-amber-900 font-medium">{shippingAddress}</p>
          </div>
        )}
        {prescription.trackingNumber && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-purple-600" />
              <p className="text-xs font-semibold text-purple-800">Tracking:</p>
            </div>
            <p className="text-sm font-mono text-purple-900 font-semibold">{prescription.trackingNumber}</p>
            {prescription.trackingCarrier && (
              <p className="text-xs text-purple-800 mt-1 font-medium">Carrier: {prescription.trackingCarrier}</p>
            )}
          </div>
        )}
      </Section>

      {/* Billing */}
      <Section icon={DollarSign} title="Billing">
        <Field label="Amount" value={`$${prescription.amount.toFixed(2)}`} />
      </Section>

      {/* Status History Timeline */}
      {prescription.statusHistory && prescription.statusHistory.length > 0 && (
        <Section icon={History} title="Status History">
          <StatusTimeline history={prescription.statusHistory} />
        </Section>
      )}

      {/* Metadata */}
      <Section icon={FileText} title="Record Details">
        <Field label="Prescription ID" value={prescription.id} />
        <Field label="Created" value={formatDate(prescription.createdAt)} />
        <Field label="Last Updated" value={formatDate(prescription.updatedAt)} />
      </Section>

      {/* HIPAA Notice */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs">
        <p className="flex items-center gap-2 font-semibold mb-1">
          🔒 HIPAA-Compliant Storage
        </p>
        <p className="text-slate-300">
          All PHI fields are encrypted with AES-256-GCM. Access logged and monitored.
        </p>
      </div>
    </div>
  );
}
