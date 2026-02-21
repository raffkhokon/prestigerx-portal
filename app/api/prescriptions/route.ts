import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/encryption';
import { logPrescriptionAccess } from '@/lib/audit';

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

    // Search filter (patient name, medication, provider name, prescription ID)
    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: 'insensitive' } },
        { medicationName: { contains: search, mode: 'insensitive' } },
        { providerName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          pharmacy: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, npi: true, phone: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    // Decrypt PHI fields
    const decrypted = prescriptions.map((rx) => ({
      ...decryptPHI(rx as unknown as Record<string, unknown>, 'prescription'),
      patient: rx.patient
        ? decryptPHI(rx.patient as unknown as Record<string, unknown>, 'patient')
        : null,
    }));

    // Audit log
    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'READ',
      undefined,
      `Listed ${prescriptions.length} prescriptions`
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

    // Auto-assign clinic from session if not provided
    if (!body.clinicId && session.user.clinicId) {
      body.clinicId = session.user.clinicId;
      body.clinicName = session.user.clinicName;
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
