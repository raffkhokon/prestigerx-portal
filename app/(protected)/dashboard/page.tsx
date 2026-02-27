'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, Package, TrendingUp, Plus, Activity } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalPrescriptions: number;
  totalPatients: number;
  pendingPrescriptions: number;
  shippedPrescriptions: number;
  prescriptionsByClinic: Array<{
    clinicName: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    patientName: string;
    medicationName: string;
    clinicName: string;
    status: string;
    createdAt: string;
  }>;
}

export default function ProviderDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    if (['sales_rep', 'sales_manager'].includes(session.user.role)) {
      router.push('/sales');
      return;
    }

    fetchDashboardStats();
  }, [router, session]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard/provider');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {session?.user?.name}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {session?.user?.role === 'provider' ? 'Provider' : session?.user?.role === 'clinic' ? 'Clinic User' : 'User'} Dashboard
            </p>
          </div>
          {/* Only show "New Prescription" button for providers and admins */}
          {session?.user?.role !== 'clinic' && (
            <Link
              href="/prescriptions/create"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Plus className="h-4 w-4" />
              New Prescription
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            label="Total Prescriptions"
            value={stats?.totalPrescriptions || 0}
            color="blue"
          />
          <StatCard
            icon={Users}
            label="Total Patients"
            value={stats?.totalPatients || 0}
            color="green"
          />
          <StatCard
            icon={Package}
            label="Pending"
            value={stats?.pendingPrescriptions || 0}
            color="yellow"
          />
          <StatCard
            icon={TrendingUp}
            label="Shipped"
            value={stats?.shippedPrescriptions || 0}
            color="purple"
          />
        </div>

        {/* Prescriptions by Clinic */}
        {stats?.prescriptionsByClinic && stats.prescriptionsByClinic.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Prescriptions by Clinic
            </h2>
            <div className="space-y-3">
              {stats.prescriptionsByClinic.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.clinicName}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Prescriptions
            </h2>
            <Link
              href="/prescriptions"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </Link>
          </div>

          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.patientName} • {item.medicationName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.clinicName} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'shipped'
                        ? 'bg-purple-100 text-purple-700'
                        : item.status === 'new'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No prescriptions yet</p>
              <p className="text-xs mt-1">Create your first prescription to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
