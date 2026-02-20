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
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
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
        {status}
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
