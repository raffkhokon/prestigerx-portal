import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/encryption';
import { logPatientAccess } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (session.user.role !== 'admin') {
      where.clinicId = session.user.clinicId;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    const decrypted = patients.map((p) =>
      decryptPHI(p as unknown as Record<string, unknown>, 'patient')
    );

    await logPatientAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'READ',
      undefined,
      `Listed ${patients.length} patients`
    );

    return NextResponse.json({
      data: decrypted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/patients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Auto-assign clinic from session if not provided
    if (!body.clinicId && session.user.clinicId) {
      body.clinicId = session.user.clinicId;
      body.clinicName = session.user.clinicName;
    }

    const encrypted = encryptPHI(body, 'patient');

    const patient = await prisma.patient.create({
      data: {
        clinicId: encrypted.clinicId,
        clinicName: encrypted.clinicName,
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
        consentGiven: encrypted.consentGiven || false,
        consentDate: encrypted.consentDate ? new Date(encrypted.consentDate as string) : null,
      },
    });

    await logPatientAccess(
      session.user.id,
      session.user.email!,
      session.user.role,
      session.user.clinicId,
      'CREATE',
      patient.id,
      'Created new patient'
    );

    return NextResponse.json(
      decryptPHI(patient as unknown as Record<string, unknown>, 'patient'),
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/patients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
