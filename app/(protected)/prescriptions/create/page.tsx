'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Building2 } from 'lucide-react';

interface FormData {
  // Step 1: Patient
  patientId: string;
  patientName: string;
  
  // Step 2: Clinic (IMPORTANT: Determines billing)
  clinicId: string;
  clinicName: string;
  
  // Pharmacy + Product
  pharmacyId: string;
  pharmacyName: string;
  productId: string;

  // Step 3: Medication
  medicationName: string;
  medicationStrength: string;
  medicationForm: string;
  quantity: number;
  directions: string;
  refills: number;
  daw: boolean;
  
  // Step 4: Shipping
  shippingMethod: string;
  amount: number;
}

const STEPS = [
  'Select Patient',
  'Select Clinic',  // NEW: Critical for billing
  'Medication Details',
  'Shipping & Review',
];

export default function CreatePrescriptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [assignedClinics, setAssignedClinics] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<FormData>({
    patientId: '',
    patientName: '',
    clinicId: '',
    clinicName: '',
    pharmacyId: '',
    pharmacyName: '',
    productId: '',
    medicationName: '',
    medicationStrength: '',
    medicationForm: 'injection',
    quantity: 1,
    directions: '',
    refills: 0,
    daw: false,
    shippingMethod: 'ship_to_patient',
    amount: 0,
  });

  useEffect(() => {
    if (!session?.user) return;

    if (session.user.role === 'clinic') {
      router.push('/prescriptions');
      return;
    }

    fetchPatients();
    fetchAssignedClinics();
  }, [session, router]);

  useEffect(() => {
    if (!form.clinicId) {
      setPharmacies([]);
      setProducts([]);
      return;
    }

    fetch(`/api/pharmacies?clinicId=${form.clinicId}`)
      .then((res) => res.json())
      .then((data) => setPharmacies(data.data || []))
      .catch((error) => console.error('Failed to fetch pharmacies:', error));
  }, [form.clinicId]);

  useEffect(() => {
    if (!form.pharmacyId) {
      setProducts([]);
      return;
    }

    fetch(`/api/products?pharmacyId=${form.pharmacyId}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.data || []))
      .catch((error) => console.error('Failed to fetch products:', error));
  }, [form.pharmacyId]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients?limit=100');
      const data = await res.json();
      setPatients(data.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const fetchAssignedClinics = async () => {
    try {
      if (session?.user?.role === 'admin') {
        // Admins can select from all active clinics
        const res = await fetch('/api/clinics');
        const data = await res.json();
        setAssignedClinics(data.data || []);
        return;
      }

      // Providers can only select clinics they are assigned to
      const res = await fetch(`/api/providers/${session?.user?.id}/clinics`);
      const data = await res.json();
      setAssignedClinics(data.clinics || []);
    } catch (error) {
      console.error('Failed to fetch clinics:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Provider info auto-filled from session
          providerName: session?.user?.name,
          providerNpi: session?.user?.npi,
          providerPhone: session?.user?.phone,
          providerDea: session?.user?.dea,
          providerLicense: session?.user?.license,
          providerPractice: session?.user?.practice,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create prescription');
      }

      // Success - redirect to prescriptions list
      router.push('/prescriptions?success=true');
    } catch (error) {
      console.error('Submission error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Patient
        return form.patientId && form.patientName;
      case 1: // Clinic
        return form.clinicId && form.clinicName;
      case 2: // Medication
        return form.pharmacyId && form.productId && form.medicationName && form.medicationStrength && form.quantity > 0;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create New Prescription</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {STEPS.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                <span className="text-xs mt-2 text-center text-slate-600">{step}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-4 transition ${
                    index < currentStep ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6">
          {/* Step 1: Select Patient */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select or Search Patient</h2>
              <select
                value={form.patientId}
                onChange={(e) => {
                  const patient = patients.find((p) => p.id === e.target.value);
                  setForm({
                    ...form,
                    patientId: e.target.value,
                    patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
                  });
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a patient...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} • DOB: {patient.dateOfBirth || 'N/A'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Or{' '}
                <button
                  type="button"
                  onClick={() => router.push('/patients?create=1&from=prescription-create')}
                  className="text-blue-600 hover:underline"
                >
                  create new patient
                </button>
              </p>
            </div>
          )}

          {/* Step 2: Select Clinic (BILLING) */}
          {currentStep === 1 && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">
                      Important: Clinic Selection Determines Billing
                    </h3>
                    <p className="text-xs text-blue-700 mt-1">
                      The clinic you select will be billed for this prescription. Make sure to choose the
                      correct clinic where this patient is being treated.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold mb-4">Select Clinic</h2>
              {assignedClinics.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  {session?.user?.role === 'admin' ? (
                    <>
                      <p className="text-sm">No clinics configured yet</p>
                      <p className="text-xs mt-1">Create a clinic first, then return to prescription creation</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">You are not assigned to any clinics yet</p>
                      <p className="text-xs mt-1">Contact your administrator to get assigned to clinics</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedClinics.map((clinic: any) => (
                    <button
                      key={clinic.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          clinicId: clinic.id,
                          clinicName: clinic.name,
                          pharmacyId: '',
                          pharmacyName: '',
                          productId: '',
                        })
                      }
                      className={`w-full p-4 border-2 rounded-lg text-left transition ${
                        form.clinicId === clinic.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{clinic.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {clinic.address || 'No address on file'}
                          </p>
                        </div>
                        {form.clinicId === clinic.id && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Medication */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Medication Details</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pharmacy *
                </label>
                <select
                  value={form.pharmacyId}
                  onChange={(e) => {
                    const pharmacy = pharmacies.find((p) => p.id === e.target.value);
                    setForm({
                      ...form,
                      pharmacyId: e.target.value,
                      pharmacyName: pharmacy?.name || '',
                      productId: '',
                      medicationName: '',
                      medicationStrength: '',
                      amount: 0,
                    });
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select pharmacy...</option>
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product * (preloads medication + price)
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    setForm({
                      ...form,
                      productId: e.target.value,
                      medicationName: product?.name || form.medicationName,
                      medicationForm: product?.type || form.medicationForm,
                      amount: typeof product?.price === 'number' ? product.price : form.amount,
                    });
                  }}
                  disabled={!form.pharmacyId}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">{form.pharmacyId ? 'Select product...' : 'Select pharmacy first'}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}{typeof product.price === 'number' ? ` — $${product.price.toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
                {form.pharmacyId && products.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No products configured for this pharmacy. Add products in Product Management before creating this prescription.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={form.medicationName}
                  readOnly
                  placeholder="Select a product to auto-fill"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Strength *
                  </label>
                  <input
                    type="text"
                    value={form.medicationStrength}
                    onChange={(e) => setForm({ ...form, medicationStrength: e.target.value })}
                    placeholder="e.g., 15mg/mL"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Form</label>
                  <select
                    value={form.medicationForm}
                    onChange={(e) => setForm({ ...form, medicationForm: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="injection">Injection</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="cream">Cream</option>
                    <option value="gel">Gel</option>
                    <option value="nasal_spray">Nasal Spray</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Refills</label>
                  <input
                    type="number"
                    min="0"
                    value={form.refills}
                    onChange={(e) => setForm({ ...form, refills: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Directions (Sig)
                </label>
                <textarea
                  value={form.directions}
                  onChange={(e) => setForm({ ...form, directions: e.target.value })}
                  placeholder="e.g., Inject subcutaneously once weekly"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Shipping & Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Shipping & Review</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Shipping Method
                </label>
                <select
                  value={form.shippingMethod}
                  onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ship_to_patient">Ship to Patient</option>
                  <option value="ship_to_clinic">Ship to Clinic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm text-slate-900">Prescription Summary</h3>
                <div className="text-sm text-slate-700 space-y-1">
                  <p><strong>Patient:</strong> {form.patientName}</p>
                  <p><strong>Clinic:</strong> {form.clinicName} (will be billed)</p>
                  <p><strong>Pharmacy:</strong> {form.pharmacyName || 'Not selected'}</p>
                  <p><strong>Medication:</strong> {form.medicationName} {form.medicationStrength}</p>
                  <p><strong>Quantity:</strong> {form.quantity}</p>
                  <p><strong>Provider:</strong> {session?.user?.name}</p>
                  {form.amount > 0 && <p><strong>Amount:</strong> ${form.amount.toFixed(2)}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Submit Prescription
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
