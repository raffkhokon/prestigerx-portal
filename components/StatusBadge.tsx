'use client';

import { Clock, Loader2, Truck, CheckCircle2, XCircle, Package } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment';
}

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  animate?: boolean;
}

const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  new: {
    label: 'New',
    icon: Clock,
    className: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  received: {
    label: 'Received',
    icon: Package,
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  processed: {
    label: 'Processed',
    icon: CheckCircle2,
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  need_clarification: {
    label: 'Need Clarification',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    animate: true,
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Payment Pending',
    icon: Clock,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  paid: {
    label: 'Payment Successful',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  failed: {
    label: 'Payment Failed',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled_by_prescriber: {
    label: 'Cancelled by Prescriber',
    icon: XCircle,
    className: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  cancelled: {
    label: 'Refunded',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

export default function StatusBadge({ status, type = 'order' }: StatusBadgeProps) {
  const config = type === 'order' ? ORDER_STATUS_CONFIG : PAYMENT_STATUS_CONFIG;
  const statusConfig = config[status as keyof typeof config];

  if (!statusConfig) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        <Package className="h-3.5 w-3.5" />
        {status.replace(/_/g, ' ')}
      </span>
    );
  }

  const Icon = statusConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${statusConfig.animate ? 'animate-spin' : ''}`} />
      {statusConfig.label}
    </span>
  );
}
