import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/encryption';
import { logPrescriptionAccess } from '@/lib/audit';
import { isOrderStatus, isPaymentStatus } from '@/lib/statuses';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        pharmacy: true,
        clinic: true,
        billingTransactions: true,
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Enforce clinic ownership
    if (session.user.role !== 'admin' && prescription.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const decrypted = {
      ...decryptPHI(prescription as unknown as Record<string, unknown>, 'prescription'),
      patient: prescription.patient
        ? decryptPHI(prescription.patient as unknown as Record<string, unknown>, 'patient')
        : null,
    };

    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'READ',
      id,
      'Viewed prescription details'
    );

    return NextResponse.json(decrypted);
  } catch (error) {
    console.error('GET /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.prescription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Enforce clinic ownership
    if (session.user.role !== 'admin' && existing.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.orderStatus && !isOrderStatus(body.orderStatus)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    if (body.paymentStatus && !isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    }

    const encrypted = encryptPHI(body, 'prescription');

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        pharmacyId: encrypted.pharmacyId,
        pharmacyName: encrypted.pharmacyName,
        medicationName: encrypted.medicationName,
        medicationStrength: encrypted.medicationStrength,
        medicationForm: encrypted.medicationForm,
        quantity: encrypted.quantity,
        directions: encrypted.directions,
        refills: encrypted.refills,
        writtenDate: encrypted.writtenDate,
        daw: encrypted.daw,
        shippingMethod: encrypted.shippingMethod,
        providerName: encrypted.providerName,
        providerNpi: encrypted.providerNpi,
        providerPhone: encrypted.providerPhone,
        providerDea: encrypted.providerDea,
        providerLicense: encrypted.providerLicense,
        providerPractice: encrypted.providerPractice,
        amount: encrypted.amount,
        paymentStatus: encrypted.paymentStatus,
        orderStatus: encrypted.orderStatus,
        trackingNumber: encrypted.trackingNumber,
        trackingCarrier: encrypted.trackingCarrier,
      },
    });

    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'UPDATE',
      id,
      'Updated prescription'
    );

    return NextResponse.json(decryptPHI(updated as unknown as Record<string, unknown>, 'prescription'));
  } catch (error) {
    console.error('PUT /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete prescriptions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.prescription.delete({ where: { id } });

    await logPrescriptionAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'DELETE',
      id,
      'Deleted prescription'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
