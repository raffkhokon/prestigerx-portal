'use client';

import StatusBadge from './StatusBadge';
import StatusTimeline from './StatusTimeline';
import { User, Pill, Hospital, Building2, Truck, Calendar, DollarSign, FileText, History } from 'lucide-react';

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
    trackingNumber?: string;
    trackingCarrier?: string;
    orderStatus: string;
    paymentStatus: string;
    amount: number;
    createdAt: string;
    updatedAt: string;
    statusHistory?: StatusChange[];
  };
}

export default function PrescriptionDetails({ prescription }: PrescriptionDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </h3>
      <div className="pl-6 space-y-2">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | number | boolean }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between">
        <span className="text-sm text-slate-600">{label}:</span>
        <span className="text-sm font-medium text-slate-900">{value.toString()}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Section */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
        <StatusBadge status={prescription.orderStatus} type="order" />
        <StatusBadge status={prescription.paymentStatus} type="payment" />
      </div>

      {/* Patient Information */}
      <Section icon={User} title="Patient Information">
        <Field label="Name" value={prescription.patientName} />
        <Field label="Date of Birth" value={prescription.patientDob} />
        <Field label="Gender" value={prescription.patientGender} />
        {prescription.patientAllergies && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Allergies:</p>
            <p className="text-sm text-red-700">{prescription.patientAllergies}</p>
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
            <p className="text-sm text-blue-700">{prescription.directions}</p>
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
        <Field label="Shipping Method" value={prescription.shippingMethod?.replace('_', ' ')} />
        {prescription.trackingNumber && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-purple-600" />
              <p className="text-xs font-semibold text-purple-800">Tracking:</p>
            </div>
            <p className="text-sm font-mono text-purple-700">{prescription.trackingNumber}</p>
            {prescription.trackingCarrier && (
              <p className="text-xs text-purple-600 mt-1">Carrier: {prescription.trackingCarrier}</p>
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
