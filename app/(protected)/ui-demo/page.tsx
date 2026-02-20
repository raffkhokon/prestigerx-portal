'use client';

import { useState } from 'react';
import Toast from '@/components/Toast';
import { TableSkeleton, FormSkeleton, Skeleton } from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { FileText } from 'lucide-react';

export default function UIDemo() {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">UI Component Demo</h1>
        <p className="text-slate-500">Preview of new UI improvements for PrestigeRx</p>
      </div>

      {/* Toast Notifications */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Toast Notifications
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowSuccessToast(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Show Success Toast
          </button>
          <button
            onClick={() => setShowErrorToast(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Show Error Toast
          </button>
          <button
            onClick={() => setShowInfoToast(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Show Info Toast
          </button>
        </div>

        {showSuccessToast && (
          <Toast
            message="Prescription created successfully!"
            type="success"
            onClose={() => setShowSuccessToast(false)}
          />
        )}
        {showErrorToast && (
          <Toast
            message="Failed to save patient. Please try again."
            type="error"
            onClose={() => setShowErrorToast(false)}
          />
        )}
        {showInfoToast && (
          <Toast
            message="This is an informational message for the user."
            type="info"
            onClose={() => setShowInfoToast(false)}
          />
        )}
      </section>

      {/* Status Badges */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Status Badges</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Order Status:</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" type="order" />
              <StatusBadge status="processing" type="order" />
              <StatusBadge status="shipped" type="order" />
              <StatusBadge status="delivered" type="order" />
              <StatusBadge status="cancelled" type="order" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Payment Status:</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" type="payment" />
              <StatusBadge status="paid" type="payment" />
              <StatusBadge status="cancelled" type="payment" />
            </div>
          </div>
        </div>
      </section>

      {/* Loading Skeletons */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Loading Skeletons</h2>
        
        <button
          onClick={() => setShowSkeleton(!showSkeleton)}
          className="mb-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
        >
          {showSkeleton ? 'Hide' : 'Show'} Skeleton
        </button>

        {showSkeleton ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Table Skeleton:</h3>
              <TableSkeleton rows={3} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Form Skeleton:</h3>
              <FormSkeleton />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Individual Skeleton:</h3>
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">👤 John Doe</p>
              <p className="text-sm text-slate-600">💊 Lipitor 20mg • Qty: 30</p>
              <p className="text-sm text-slate-600">🏥 Dr. Smith • 📅 Feb 20, 2026</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">👤 Jane Smith</p>
              <p className="text-sm text-slate-600">💊 Metformin 500mg • Qty: 60</p>
              <p className="text-sm text-slate-600">🏥 Dr. Johnson • 📅 Feb 19, 2026</p>
            </div>
          </div>
        )}
      </section>

      {/* Example Cards */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Example Prescription Cards</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card 1 */}
          <div className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-900">John Doe</p>
                <p className="text-sm text-slate-500">DOB: 03/02/1993</p>
              </div>
              <StatusBadge status="processing" type="order" />
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-slate-700">
                <span className="font-medium">💊</span> Lipitor 20mg • Tablet
              </p>
              <p className="text-slate-600">Qty: 30 • Refills: 2</p>
              <p className="text-slate-600">
                <span className="font-medium">🏥</span> Dr. Jane Smith
              </p>
              <p className="text-slate-500 text-xs">Created: Feb 20, 2026</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-900">Jane Smith</p>
                <p className="text-sm text-slate-500">DOB: 05/15/1985</p>
              </div>
              <StatusBadge status="delivered" type="order" />
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-slate-700">
                <span className="font-medium">💊</span> Metformin 500mg • Tablet
              </p>
              <p className="text-slate-600">Qty: 60 • Refills: 5</p>
              <p className="text-slate-600">
                <span className="font-medium">🏥</span> Dr. Robert Johnson
              </p>
              <p className="text-slate-500 text-xs">Created: Feb 19, 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-blue-600 flex items-center justify-center text-white font-medium">Primary</div>
            <p className="text-xs text-slate-600">Actions, Links</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-green-600 flex items-center justify-center text-white font-medium">Success</div>
            <p className="text-xs text-slate-600">Completed, Delivered</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-yellow-500 flex items-center justify-center text-white font-medium">Warning</div>
            <p className="text-xs text-slate-600">Pending, Review</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-red-600 flex items-center justify-center text-white font-medium">Error</div>
            <p className="text-xs text-slate-600">Failed, Cancelled</p>
          </div>
        </div>
      </section>
    </div>
  );
}
