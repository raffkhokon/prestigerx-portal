export const ORDER_STATUSES = [
  'new',
  'pending',
  'received',
  'processed',
  'need_clarification',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'cancelled_by_prescriber',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  pending: 'Pending',
  received: 'Received',
  processed: 'Processed',
  need_clarification: 'Need Clarification',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment Pending',
  paid: 'Payment Successful',
  failed: 'Payment Failed',
  cancelled_by_prescriber: 'Cancelled by Prescriber',
  cancelled: 'Refunded',
};

export const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

export const isPaymentStatus = (value: string): value is PaymentStatus =>
  (PAYMENT_STATUSES as readonly string[]).includes(value);
