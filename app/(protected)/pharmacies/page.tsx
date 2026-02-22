'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, Plus, Search, Loader2, X, CheckCircle2, AlertCircle, Phone, Mail, MapPin, ChevronRight, Pill } from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  type: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  supportedMedications: string[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  medicationStrength?: string;
  medicationForm?: string;
  price?: number;
  status?: string;
  createdAt?: string;
}

const emptyForm = {
  name: '',
  type: 'compounding',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  supportedMedications: [] as string[],
  status: 'active',
};

export default function PharmaciesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'compounding' | 'retail' | 'specialty'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'status'>('name');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Pharmacy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [medInput, setMedInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedItem, setSelectedItem] = useState<Pharmacy | null>(null);
  const [panelTab, setPanelTab] = useState<'overview' | 'medications'>('overview');
  const [pharmacyProducts, setPharmacyProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'name' | 'newest' | 'price'>('name');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacies');
      const data = await res.json();
      setPharmacies(data.data || []);
    } catch {
      setErrorMsg('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedItem?.id) {
      setPharmacyProducts([]);
      return;
    }

    setProductsLoading(true);
    fetch(`/api/products?pharmacyId=${selectedItem.id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setPharmacyProducts(data.data || []))
      .catch(() => setPharmacyProducts([]))
      .finally(() => setProductsLoading(false));
  }, [selectedItem?.id]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setMedInput('');
    setShowForm(true);
  };

  const openEdit = (item: Pharmacy) => {
    setEditItem(item);
    setForm({
      name: item.name,
      type: item.type,
      contactName: item.contactName || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      supportedMedications: item.supportedMedications || [],
      status: item.status,
    });
    setMedInput('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { setErrorMsg('Pharmacy name is required'); return; }
    setSubmitting(true);
    try {
      const url = editItem ? `/api/pharmacies/${editItem.id}` : '/api/pharmacies';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccessMsg(editItem ? 'Pharmacy updated!' : 'Pharmacy added!');
      setShowForm(false);
      fetchData();
    } catch {
      setErrorMsg('Failed to save pharmacy');
    } finally {
      setSubmitting(false);
    }
  };

  const addMed = () => {
    if (!medInput.trim()) return;
    setForm((f) => ({ ...f, supportedMedications: [...f.supportedMedications, medInput.trim()] }));
    setMedInput('');
  };

  const removeMed = (idx: number) => {
    setForm((f) => ({ ...f, supportedMedications: f.supportedMedications.filter((_, i) => i !== idx) }));
  };

  const filtered = pharmacies.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || p.name?.toLowerCase().includes(q) || p.contactName?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return a.name.localeCompare(b.name);
  });

  const activeCount = pharmacies.filter((p) => p.status === 'active').length;
  const inactiveCount = pharmacies.filter((p) => p.status !== 'active').length;

  const filteredProducts = pharmacyProducts.filter((m) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.medicationStrength?.toLowerCase().includes(q) ||
      m.medicationForm?.toLowerCase().includes(q)
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (productSort === 'newest') return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    if (productSort === 'price') return (a.price || 0) - (b.price || 0);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Pharmacies
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{pharmacies.length} compounding pharmacies</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
              <Plus className="h-4 w-4" />
              Add Pharmacy
            </button>
          )}
        </div>
        {successMsg && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />{successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />{errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${selectedItem ? 'w-1/2' : 'flex-1'} flex flex-col bg-white border-r border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setStatusFilter('all')} className={`text-xs px-2.5 py-1 rounded-full border ${statusFilter === 'all' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>All</button>
              <button onClick={() => setStatusFilter('active')} className={`text-xs px-2.5 py-1 rounded-full border ${statusFilter === 'active' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>Active</button>
              <button onClick={() => setStatusFilter('inactive')} className={`text-xs px-2.5 py-1 rounded-full border ${statusFilter === 'inactive' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-600'}`}>Inactive</button>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'compounding' | 'retail' | 'specialty')} className="ml-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                <option value="all">All types</option>
                <option value="compounding">Compounding</option>
                <option value="retail">Retail</option>
                <option value="specialty">Specialty</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'newest' | 'status')} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                <option value="name">Sort: Name</option>
                <option value="newest">Sort: Newest</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">{pharmacies.length}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-[11px] text-green-700">Active</p>
                <p className="text-sm font-semibold text-green-800">{activeCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] text-slate-500">Inactive</p>
                <p className="text-sm font-semibold text-slate-700">{inactiveCount}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-4 animate-pulse">
                    <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-1/3 bg-slate-100 rounded mb-4" />
                    <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                    <div className="h-3 w-5/6 bg-slate-100 rounded mb-2" />
                    <div className="h-3 w-4/6 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Building2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No pharmacies found</p>
              {isAdmin && (
                <button onClick={openCreate} className="mt-4 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition">
                  Add first pharmacy
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sorted.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedItem(p);
                      setPanelTab('overview');
                      setProductSearch('');
                    }}
                    className={`text-left rounded-xl border-2 p-4 bg-white transition-all hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${selectedItem?.id === p.id ? 'border-blue-500 shadow-md' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">{p.type}</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-slate-600 flex items-center gap-1.5"><Phone className="h-3 w-3" />{p.phone || 'No phone listed'}</p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{p.email || 'No email listed'}</p>
                      <p className="text-xs text-slate-500 flex items-start gap-1.5"><MapPin className="h-3 w-3 mt-0.5" />{p.address || 'No address listed'}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">{p.supportedMedications?.length || 0} supported meds</p>
                      <p className="text-[11px] font-medium text-blue-700">View details</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="w-1/2 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-lg">{selectedItem.name}</h2>
                <div className="flex gap-2">
                  {isAdmin && <button onClick={() => openEdit(selectedItem)} className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition">Edit</button>}
                  <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button
                    onClick={() => setPanelTab('overview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${panelTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setPanelTab('medications')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${panelTab === 'medications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Available Medications ({pharmacyProducts.length})
                  </button>
                </div>

                {panelTab === 'overview' ? (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {selectedItem.contactName && <p className="text-sm text-slate-700">{selectedItem.contactName}</p>}
                      {selectedItem.phone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selectedItem.phone}</p>}
                      {selectedItem.email && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selectedItem.email}</p>}
                      {selectedItem.address && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selectedItem.address}</p>}
                    </div>
                    {selectedItem.supportedMedications?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Supported Medications</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItem.supportedMedications.map((med) => (
                            <span key={med} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{med}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search medications..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={productSort}
                        onChange={(e) => setProductSort(e.target.value as 'name' | 'newest' | 'price')}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white"
                      >
                        <option value="name">Name</option>
                        <option value="newest">Newest</option>
                        <option value="price">Price</option>
                      </select>
                    </div>

                    {productsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-xl border border-slate-200 p-3 animate-pulse">
                            <div className="h-4 w-1/2 bg-slate-200 rounded mb-2" />
                            <div className="h-3 w-1/3 bg-slate-100 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : sortedProducts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                        <Pill className="h-5 w-5 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm font-medium">No medications found for this pharmacy</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                        {sortedProducts.map((m) => (
                          <div key={m.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{m.medicationStrength || '-'} • {m.medicationForm || '-'}</p>
                              </div>
                              {m.status && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {m.status}
                                </span>
                              )}
                            </div>
                            {typeof m.price === 'number' && (
                              <p className="text-xs text-blue-700 font-medium mt-2">${m.price.toFixed(2)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{editItem ? 'Edit Pharmacy' : 'Add Pharmacy'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="field-label">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="field-input">
                    <option value="compounding">Compounding</option>
                    <option value="retail">Retail</option>
                    <option value="specialty">Specialty</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="field-input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Contact Name</label>
                <input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} className="field-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field-input" />
                </div>
              </div>
              <div>
                <label className="field-label">Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="field-input" />
              </div>
              <div>
                <label className="field-label">Supported Medications</label>
                <div className="flex gap-2">
                  <input value={medInput} onChange={(e) => setMedInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMed()} className="field-input flex-1" placeholder="Add medication..." />
                  <button onClick={addMed} className="bg-blue-100 text-blue-700 px-3 rounded-lg text-sm font-medium hover:bg-blue-200 transition">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.supportedMedications.map((med, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {med}
                      <button onClick={() => removeMed(i)} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editItem ? 'Update' : 'Add Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .field-label { display: block; font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .field-input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .field-input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }
      `}</style>
    </div>
  );
}
