'use client';

import { User, Pill, Hospital, Calendar, DollarSign } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface PrescriptionCardProps {
  prescription: {
    id: string;
    patientName: string;
    patientDob?: string;
    medicationName?: string;
    medicationStrength?: string;
    medicationForm?: string;
    quantity: number;
    directions?: string;
    providerName?: string;
    providerNpi?: string;
    pharmacyName?: string;
    orderStatus: string;
    paymentStatus: string;
    amount: number;
    createdAt: string;
  };
  onClick?: () => void;
}

export default function PrescriptionCard({ prescription, onClick }: PrescriptionCardProps) {
  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(prescription.patientDob);
  const createdDate = new Date(prescription.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header: Patient + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2 flex-1">
          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {prescription.patientName}
            </h3>
            {age && (
              <p className="text-sm text-slate-500">{age} years old</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={prescription.orderStatus} type="order" />
          {prescription.paymentStatus && (
            <StatusBadge status={prescription.paymentStatus} type="payment" />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 my-3" />

      {/* Medication Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <Pill className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {prescription.medicationName || 'No medication specified'}
              {prescription.medicationStrength && ` ${prescription.medicationStrength}`}
            </p>
            <p className="text-xs text-slate-600">
              {prescription.medicationForm && `${prescription.medicationForm} • `}
              Qty: {prescription.quantity}
            </p>
          </div>
        </div>

        {prescription.directions && (
          <p className="text-xs text-slate-600 ml-6 line-clamp-2">
            📝 {prescription.directions}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 my-3" />

      {/* Footer: Provider, Date, Amount */}
      <div className="space-y-1.5">
        {prescription.providerName && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Hospital className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">
              {prescription.providerName}
              {prescription.providerNpi && ` • NPI: ${prescription.providerNpi}`}
            </span>
          </div>
        )}

        {prescription.pharmacyName && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400">🏪</span>
            <span className="truncate">{prescription.pharmacyName}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{createdDate}</span>
            </div>
            {prescription.amount > 0 && (
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{prescription.amount.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          {/* Prescription ID */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">ID:</span>
            <code className="text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded">
              {prescription.id.slice(0, 12)}...
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
