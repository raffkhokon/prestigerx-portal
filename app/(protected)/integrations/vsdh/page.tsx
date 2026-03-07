'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

type VSDHStatus = {
  client: {
    configured: boolean;
    hasCachedToken: boolean;
    tokenExpiresAt: string | null;
    tokenMsRemaining: number | null;
  };
  dispatch: {
    totalTracked: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    failedRetries: number;
    lastAttemptAt: string | null;
  };
  webhooks: {
    lastReceivedAt: string | null;
  };
  recentFailures: Array<{
    id: string;
    patientName?: string;
    clinicName?: string;
    pharmacyName?: string | null;
    apiError?: string | null;
    apiRetryCount?: number;
    updatedAt: string;
  }>;
};

export default function VSDHIntegrationPage() {
  const [data, setData] = useState<VSDHStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/vsdh/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load VSDH status');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tokenMinutes = data?.client.tokenMsRemaining != null
    ? Math.floor(data.client.tokenMsRemaining / 60000)
    : null;

  return (
    <div className="page-wrap pt-6 space-y-4">
      <div className="panel px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            VSDH Integration Status
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Live health and dispatch telemetry</p>
        </div>
        <button onClick={load} className="modern-button-secondary" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="panel px-6 py-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</div>}

      {loading && !data ? (
        <div className="panel px-6 py-8 text-sm text-slate-500">Loading integration status...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="panel p-4">
              <p className="text-xs text-slate-500">Auth Config</p>
              <p className={`mt-1 text-sm font-semibold ${data.client.configured ? 'text-emerald-700' : 'text-red-700'}`}>
                {data.client.configured ? 'Configured' : 'Missing'}
              </p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-slate-500">Token Cache</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{data.client.hasCachedToken ? 'Warm' : 'Cold'}</p>
              {tokenMinutes !== null && <p className="text-xs text-slate-500">~{tokenMinutes}m left</p>}
            </div>
            <div className="panel p-4">
              <p className="text-xs text-slate-500">Dispatch Sent</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{data.dispatch.sent}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-slate-500">Dispatch Failed</p>
              <p className="mt-1 text-sm font-semibold text-red-700">{data.dispatch.failed}</p>
            </div>
          </div>

          <div className="panel px-6 py-5">
            <h2 className="font-semibold text-slate-900 mb-3">Operational Timeline</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p>Last dispatch attempt: {data.dispatch.lastAttemptAt ? new Date(data.dispatch.lastAttemptAt).toLocaleString() : '—'}</p>
              <p>Last webhook received: {data.webhooks.lastReceivedAt ? new Date(data.webhooks.lastReceivedAt).toLocaleString() : '—'}</p>
              <p>Retry queue count: {data.dispatch.failedRetries}</p>
            </div>
          </div>

          <div className="panel px-6 py-5">
            <h2 className="font-semibold text-slate-900 mb-3">Recent Failures</h2>
            {data.recentFailures.length === 0 ? (
              <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> No recent failed dispatches.</p>
            ) : (
              <div className="space-y-2">
                {data.recentFailures.map((f) => (
                  <div key={f.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm font-medium text-red-900">{f.patientName || 'Unknown Patient'} • {f.pharmacyName || 'Pharmacy'}</p>
                    <p className="text-xs text-red-800">{f.apiError || 'Unknown error'} (retries: {f.apiRetryCount || 0})</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel px-6 py-4 text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-indigo-600" />
            Endpoint for VSDH webhook heartbeat: <code className="ml-1">/api/webhooks/vsdh</code>
          </div>
        </>
      ) : (
        <div className="panel px-6 py-8 text-sm text-slate-500 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> No data.</div>
      )}
    </div>
  );
}
