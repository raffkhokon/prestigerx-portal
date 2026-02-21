'use client';

import { Clock, User } from 'lucide-react';
import StatusBadge from './StatusBadge';

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

interface StatusTimelineProps {
  history: StatusChange[];
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No status changes yet</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      clinic: 'bg-blue-100 text-blue-700',
      pharmacy: 'bg-green-100 text-green-700',
      provider: 'bg-orange-100 text-orange-700',
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

        {/* Timeline Items */}
        <div className="space-y-6">
          {history.map((change, index) => (
            <div key={change.id} className="relative flex gap-4">
              {/* Timeline Dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border-2 border-blue-500">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3">
                  {/* Header: Status Change */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {change.statusType} Status:
                      </span>
                      {change.oldStatus && (
                        <>
                          <StatusBadge 
                            status={change.oldStatus} 
                            type={change.statusType} 
                          />
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <StatusBadge 
                        status={change.newStatus} 
                        type={change.statusType} 
                      />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(change.createdAt)}
                    </span>
                  </div>

                  {/* Changed By */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                      <User className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {change.changedByName}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(change.changedByRole)}`}>
                      {change.changedByRole}
                    </span>
                  </div>

                  {/* Notes */}
                  {change.notes && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Note:</span> {change.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
