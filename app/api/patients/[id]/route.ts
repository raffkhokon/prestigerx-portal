import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/encryption';
import { logPatientAccess } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { prescriptions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role !== 'admin' && patient.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const decrypted = decryptPHI(patient as unknown as Record<string, unknown>, 'patient');

    await logPatientAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'READ',
      id
    );

    return NextResponse.json(decrypted);
  } catch (error) {
    console.error('GET /api/patients/[id] error:', error);
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

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role !== 'admin' && existing.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const encrypted = encryptPHI(body, 'patient');

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        firstName: encrypted.firstName,
        lastName: encrypted.lastName,
        dateOfBirth: encrypted.dateOfBirth,
        gender: encrypted.gender,
        phone: encrypted.phone,
        email: encrypted.email,
        allergies: encrypted.allergies,
        streetAddress: encrypted.streetAddress,
        city: encrypted.city,
        state: encrypted.state,
        zipCode: encrypted.zipCode,
        consentGiven: encrypted.consentGiven,
        consentDate: encrypted.consentDate ? new Date(encrypted.consentDate as string) : undefined,
      },
    });

    await logPatientAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'UPDATE',
      id
    );

    return NextResponse.json(decryptPHI(updated as unknown as Record<string, unknown>, 'patient'));
  } catch (error) {
    console.error('PUT /api/patients/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.patient.delete({ where: { id } });

    await logPatientAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'DELETE',
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/patients/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
