import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/encryption';
import { logPrescriptionAccess } from '@/lib/audit';

type DecryptedPrescription = Record<string, unknown> & {
  id?: string;
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  patientAllergies?: string;
  medicationName?: string;
  providerName?: string;
  patient?: Record<string, unknown> | null;
};

function normalizePrescription(rx: DecryptedPrescription): DecryptedPrescription {
  const patient = (rx.patient || {}) as Record<string, unknown>;
  const first = String(patient.firstName || '').trim();
  const last = String(patient.lastName || '').trim();
  const fullName = `${first} ${last}`.trim();

  const allergiesRaw = patient.allergies;
  const allergies = Array.isArray(allergiesRaw)
    ? allergiesRaw.join(', ')
    : (typeof allergiesRaw === 'string' ? allergiesRaw : '');

  return {
    ...rx,
    patientName: String(rx.patientName || fullName || '').trim(),
    patientDob: String(rx.patientDob || patient.dateOfBirth || '').trim(),
    patientGender: String(rx.patientGender || patient.gender || '').trim(),
    patientAllergies: String(rx.patientAllergies || allergies || '').trim(),
    patientPhone: String(patient.phone || '').trim(),
    patientEmail: String(patient.email || '').trim(),
    patientStreetAddress: String(patient.streetAddress || '').trim(),
    patientCity: String(patient.city || '').trim(),
    patientState: String(patient.state || '').trim(),
    patientZipCode: String(patient.zipCode || '').trim(),
  };
}

function parseClinicAddress(address?: string | null) {
  if (!address) return { street: '', city: '', state: '', zip: '' };

  // Expected common format: "Street, City, ST ZIP"
  const parts = address.split(',').map((p) => p.trim());
  const street = parts[0] || '';
  const city = parts[1] || '';

  let state = '';
  let zip = '';
  const stateZip = parts[2] || '';
  const match = stateZip.match(/^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  if (match) {
    state = match[1] || '';
    zip = match[2] || '';
  }

  return { street, city, state, zip };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const providerId = searchParams.get('providerId');
    const paymentStatus = searchParams.get('paymentStatus');
    const orderStatus = searchParams.get('orderStatus');
    const shippingMethod = searchParams.get('shipping');
    const sortBy = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Multi-tenant: clinic users only see their own prescriptions
    if (session.user.role !== 'admin' && session.user.clinicId) {
      where.clinicId = session.user.clinicId;
    }

    // Provider filter (for clinic users)
    if (providerId) {
      where.providerId = providerId;
    }

    // Payment status filter
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Order status filter
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }

    // Shipping method filter
    if (shippingMethod) {
      where.shippingMethod = shippingMethod;
    }

    let decrypted: DecryptedPrescription[] = [];
    let total = 0;

    if (search) {
      // PHI fields are encrypted in DB, so perform search after decryption in app layer
      const allPrescriptions = await prisma.prescription.findMany({
        where,
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              phone: true,
              email: true,
              allergies: true,
              streetAddress: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          pharmacy: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, npi: true, phone: true } },
        },
      });

      const allDecrypted: DecryptedPrescription[] = allPrescriptions.map((rx) =>
        normalizePrescription({
          ...decryptPHI(rx as unknown as Record<string, unknown>, 'prescription'),
          patient: rx.patient
            ? decryptPHI(rx.patient as unknown as Record<string, unknown>, 'patient')
            : null,
        })
      );

      const q = search.toLowerCase();
      const filtered = allDecrypted.filter((rx) => {
        const patient = rx.patient || {};
        const patientFirst = String(patient.firstName || '');
        const patientLast = String(patient.lastName || '');
        const patientFullName = `${patientFirst} ${patientLast}`.trim();

        return (
          String(rx.patientName || '').toLowerCase().includes(q) ||
          patientFullName.toLowerCase().includes(q) ||
          String(rx.medicationName || '').toLowerCase().includes(q) ||
          String(rx.providerName || '').toLowerCase().includes(q) ||
          String(rx.id || '').toLowerCase().includes(q)
        );
      });

      total = filtered.length;
      decrypted = filtered.slice(skip, skip + limit);
    } else {
      const [prescriptions, count] = await Promise.all([
        prisma.prescription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                gender: true,
                phone: true,
                email: true,
                allergies: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
            pharmacy: { select: { id: true, name: true } },
            clinic: { select: { id: true, name: true } },
            provider: { select: { id: true, name: true, npi: true, phone: true } },
          },
        }),
        prisma.prescription.count({ where }),
      ]);

      total = count;
      decrypted = prescriptions.map((rx) =>
        normalizePrescription({
          ...decryptPHI(rx as unknown as Record<string, unknown>, 'prescription'),
          patient: rx.patient
            ? decryptPHI(rx.patient as unknown as Record<string, unknown>, 'patient')
            : null,
        })
      );
    }

    // Audit log
    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'READ',
      undefined,
      `Listed ${decrypted.length} prescriptions`
    );

    return NextResponse.json({
      data: decrypted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/prescriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only providers and admins can create prescriptions
    if (!['provider', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Product is required to ensure pharmacy-specific medication/price selection
    if (!body.productId) {
      return NextResponse.json({ error: 'Product selection is required' }, { status: 400 });
    }

    // Auto-assign clinic from session if not provided
    if (!body.clinicId && session.user.clinicId) {
      body.clinicId = session.user.clinicId;
      body.clinicName = session.user.clinicName;
    }

    // Resolve shipping destination server-side for data integrity
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    const clinic = await prisma.clinic.findUnique({ where: { id: body.clinicId } });

    if (!patient || !clinic) {
      return NextResponse.json({ error: 'Invalid patient or clinic selection' }, { status: 400 });
    }

    const decryptedPatient = decryptPHI(patient as unknown as Record<string, unknown>, 'patient') as Record<string, unknown>;

    if (body.shippingMethod === 'ship_to_clinic') {
      const clinicAddress = parseClinicAddress(clinic.address);
      body.shippingRecipientName = clinic.name;
      body.shippingStreetAddress = clinicAddress.street;
      body.shippingCity = clinicAddress.city;
      body.shippingState = clinicAddress.state;
      body.shippingZipCode = clinicAddress.zip;
      body.clinicAddress = clinic.address || '';
    } else {
      body.shippingMethod = 'ship_to_patient';
      body.shippingRecipientName = `${decryptedPatient.firstName || ''} ${decryptedPatient.lastName || ''}`.trim();
      body.shippingStreetAddress = (decryptedPatient.streetAddress as string) || '';
      body.shippingCity = (decryptedPatient.city as string) || '';
      body.shippingState = (decryptedPatient.state as string) || '';
      body.shippingZipCode = (decryptedPatient.zipCode as string) || '';
    }

    // Encrypt PHI fields before saving
    const encrypted = encryptPHI(body, 'prescription');

    const prescription = await prisma.prescription.create({
      data: {
        patientId: encrypted.patientId,
        clinicId: encrypted.clinicId,
        clinicName: encrypted.clinicName,
        clinicAddress: encrypted.clinicAddress,
        pharmacyId: encrypted.pharmacyId,
        pharmacyName: encrypted.pharmacyName,
        patientName: encrypted.patientName,
        patientDob: encrypted.patientDob,
        patientGender: encrypted.patientGender,
        patientAllergies: encrypted.patientAllergies,
        medicationName: encrypted.medicationName,
        medicationStrength: encrypted.medicationStrength,
        medicationForm: encrypted.medicationForm,
        quantity: encrypted.quantity || 1,
        directions: encrypted.directions,
        refills: encrypted.refills || 0,
        writtenDate: encrypted.writtenDate,
        daw: encrypted.daw || false,
        shippingMethod: encrypted.shippingMethod || 'ship_to_patient',
        shippingRecipientName: encrypted.shippingRecipientName,
        shippingStreetAddress: encrypted.shippingStreetAddress,
        shippingCity: encrypted.shippingCity,
        shippingState: encrypted.shippingState,
        shippingZipCode: encrypted.shippingZipCode,
        providerName: encrypted.providerName,
        providerNpi: encrypted.providerNpi,
        providerPhone: encrypted.providerPhone,
        providerDea: encrypted.providerDea,
        providerLicense: encrypted.providerLicense,
        providerPractice: encrypted.providerPractice,
        providerId: session.user.id, // Provider who created the prescription
        amount: encrypted.amount || 0,
        paymentStatus: 'pending',
        orderStatus: 'new',
      },
    });

    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'CREATE',
      prescription.id,
      'Created new prescription'
    );

    return NextResponse.json(decryptPHI(prescription as unknown as Record<string, unknown>, 'prescription'), { status: 201 });
  } catch (error) {
    console.error('POST /api/prescriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
