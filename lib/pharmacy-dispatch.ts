import { prisma } from '@/lib/prisma';
import { decryptPHI } from '@/lib/encryption';
import { createVSDigitalOrder } from '@/lib/vsdigital';

function splitName(fullName?: string | null) {
  const raw = (fullName || '').trim();
  if (!raw) return { firstName: 'Patient', lastName: 'Unknown' };
  const parts = raw.split(/\s+/);
  return {
    firstName: parts[0] || 'Patient',
    lastName: parts.slice(1).join(' ') || 'Unknown',
  };
}

function asDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = String(value).trim();
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export async function sendPrescriptionToAssignedPharmacy(
  prescriptionId: string,
  options?: { overrideSku?: string }
) {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: true,
      pharmacy: true,
    },
  });

  if (!rx) throw new Error('Prescription not found');
  if (!rx.pharmacyId || !rx.pharmacy) throw new Error('No pharmacy assigned');

  const isVSDigital =
    /vsdigital/i.test(rx.pharmacy.name || '') ||
    /vsdigital/i.test(rx.pharmacy.apiUrl || '') ||
    process.env.VSDIGITAL_FORCE_ALL_PHARMACIES === 'true';

  if (!isVSDigital) {
    throw new Error('Assigned pharmacy is not configured for VSDigital dispatch');
  }

  const decryptedRx = decryptPHI(rx as unknown as Record<string, unknown>, 'prescription') as Record<string, unknown>;
  const decryptedPatient = rx.patient
    ? (decryptPHI(rx.patient as unknown as Record<string, unknown>, 'patient') as Record<string, unknown>)
    : {};

  const patientName = String(decryptedRx.patientName || '').trim();
  const names = splitName(patientName);

  const medicationName = String(decryptedRx.medicationName || '').trim();

  const mapping = await prisma.pharmacyProductMapping.findFirst({
    where: {
      pharmacyId: rx.pharmacyId,
      isActive: true,
      localProductName: medicationName,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const skuForApi =
    (options?.overrideSku || '').trim() ||
    String(mapping?.externalSku || '').trim();

  const requiresSku = rx.pharmacy.requiresSku || /vsdigital/i.test(rx.pharmacy.name || '');

  if (requiresSku && !skuForApi) {
    throw new Error(
      `Cannot dispatch to ${rx.pharmacy.name}: missing pharmacy-specific SKU mapping for medication "${medicationName}".`
    );
  }

  const identifierForApi = skuForApi || medicationName;

  const orderPayload = {
    patient: {
      partnerPatientId: String(rx.patientId),
      firstName: names.firstName,
      lastName: names.lastName,
      dob: asDateOnly((decryptedPatient.dateOfBirth as string) || (decryptedRx.patientDob as string)),
      gender: String((decryptedPatient.gender as string) || (decryptedRx.patientGender as string) || '').toLowerCase().startsWith('f') ? 'f' : 'm',
      phone: String(decryptedPatient.phone || ''),
      email: String(decryptedPatient.email || ''),
      allergies: decryptedPatient.allergies
        ? [{ name: String(decryptedPatient.allergies), description: 'From PrestigeRx record' }]
        : [],
    },
    shippingAddress: {
      addressLine1: String(decryptedRx.shippingStreetAddress || ''),
      addressLine2: '',
      city: String(decryptedRx.shippingCity || ''),
      state: String(decryptedRx.shippingState || ''),
      country: 'USA',
      zipcode: String(decryptedRx.shippingZipCode || ''),
      contact: patientName || `${names.firstName} ${names.lastName}`,
    },
    shippingOption: process.env.VSDIGITAL_DEFAULT_SHIPPING_OPTION || 'TWO_DAY',
    orderItems: [
      {
        sku: identifierForApi,
        quantity: Number(rx.quantity || 1),
        directions: String(decryptedRx.directions || ''),
      },
    ],
    prescribedBy: {
      firstName: String(decryptedRx.providerName || '').split(' ')[0] || 'Provider',
      lastName: String(decryptedRx.providerName || '').split(' ').slice(1).join(' ') || 'Unknown',
      npi: String(decryptedRx.providerNpi || ''),
      dea: String(decryptedRx.providerDea || ''),
      phone: String(decryptedRx.providerPhone || ''),
    },
  };

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: {
      apiStatus: 'sending',
      apiError: null,
    },
  });

  try {
    const response = await createVSDigitalOrder(orderPayload);

    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        apiStatus: 'sent',
        apiSentAt: new Date(),
        externalPharmacyId: String(response?.id || response?.orderId || ''),
        apiResponse: JSON.stringify(response),
        apiError: null,
      },
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dispatch failure';
    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        apiStatus: 'failed',
        apiError: message,
        apiRetryCount: { increment: 1 },
        apiLastRetry: new Date(),
      },
    });
    throw error;
  }
}
