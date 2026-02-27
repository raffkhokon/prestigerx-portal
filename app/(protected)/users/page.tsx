'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserCog, Plus, Search, Loader2, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicId?: string;
  clinicName?: string;
  managerId?: string | null;
  manager?: { id: string; name: string; email?: string } | null;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

const emptyForm = {
  email: '', password: '', name: '',
  role: 'clinic', clinicId: '', clinicName: '', status: 'active',
};

const ROLE_COLORS: Record<string, string> = {
  admin:         'bg-purple-100 text-purple-700',
  clinic:        'bg-blue-100 text-blue-700',
  provider:      'bg-green-100 text-green-700',
  pharmacy:      'bg-orange-100 text-orange-700',
  sales_rep:     'bg-amber-100 text-amber-700',
  sales_manager: 'bg-teal-100 text-teal-700',
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRep, setSelectedRep] = useState<User | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerIdDraft, setManagerIdDraft] = useState('');
  const [savingManager, setSavingManager] = useState(false);

  // Admin-only page
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/prescriptions');
    }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setErrorMsg('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.name) {
      setErrorMsg('Email, password, and name are required');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setSuccessMsg('User created successfully!');
      setShowForm(false);
      setForm(emptyForm);
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenManagerModal = (rep: User) => {
    setSelectedRep(rep);
    setManagerIdDraft(rep.managerId || '');
    setShowManagerModal(true);
  };

  const handleSaveManagerAssignment = async () => {
    if (!selectedRep) return;
    setSavingManager(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/users/${selectedRep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: managerIdDraft || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update manager assignment');
      setSuccessMsg('Sales rep manager assignment updated');
      setShowManagerModal(false);
      setSelectedRep(null);
      await fetchData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update manager assignment');
    } finally {
      setSavingManager(false);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const managers = users.filter((u) => u.role === 'sales_manager');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-600" /> Users
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{users.length} portal users</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <UserCog className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Email', 'Role', 'Clinic', 'Manager', 'Status', 'Last Login', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      {u.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />}
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.clinicName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.manager?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'sales_rep' ? (
                      <button
                        onClick={() => handleOpenManagerModal(u)}
                        className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        Assign Manager
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Add User</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Full Name *', key: 'name', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'Clinic Name', key: 'clinicName', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['admin', 'clinic', 'provider', 'sales_manager', 'sales_rep'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {showManagerModal && selectedRep && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Assign Sales Manager</h2>
              <button onClick={() => setShowManagerModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600">Sales Rep: <span className="font-medium text-slate-900">{selectedRep.name}</span></p>
              <select
                value={managerIdDraft}
                onChange={(e) => setManagerIdDraft(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setShowManagerModal(false)} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700">Cancel</button>
              <button
                onClick={handleSaveManagerAssignment}
                disabled={savingManager}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                {savingManager && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
