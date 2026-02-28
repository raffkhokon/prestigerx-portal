import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptPHI } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'provider', 'clinic'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Providers see their own stats, clinics see their clinic scope, admins see everything
    const where: Record<string, unknown> = {};
    if (session.user.role === 'provider') {
      where.providerId = session.user.id;
    } else if (session.user.role === 'clinic') {
      if (!session.user.clinicId) {
        return NextResponse.json({
          totalPrescriptions: 0,
          totalPatients: 0,
          pendingPrescriptions: 0,
          shippedPrescriptions: 0,
          prescriptionsByClinic: [],
          recentActivity: [],
        });
      }
      where.clinicId = session.user.clinicId;
    }

    // Get total prescriptions
    const totalPrescriptions = await prisma.prescription.count({ where });

    // Get unique patients
    const uniquePatients = await prisma.prescription.findMany({
      where,
      select: { patientId: true },
      distinct: ['patientId'],
    });

    // Get prescriptions by status
    const pendingPrescriptions = await prisma.prescription.count({
      where: {
        ...where,
        orderStatus: { in: ['new', 'received', 'processed'] },
      },
    });

    const shippedPrescriptions = await prisma.prescription.count({
      where: {
        ...where,
        orderStatus: { in: ['shipped', 'delivered'] },
      },
    });

    // Get prescriptions by clinic (group by stable clinicId, not snapshot clinicName)
    const prescriptionsByClinicRaw = await prisma.prescription.groupBy({
      by: ['clinicId'],
      where,
      _count: { _all: true },
    });

    const clinicIds = prescriptionsByClinicRaw
      .map((item) => item.clinicId)
      .filter((id): id is string => Boolean(id));

    const clinics = clinicIds.length
      ? await prisma.clinic.findMany({
          where: { id: { in: clinicIds } },
          select: { id: true, name: true },
        })
      : [];

    const clinicNameById = new Map(clinics.map((c) => [c.id, c.name]));

    const prescriptionsByClinic = prescriptionsByClinicRaw.map((item) => ({
      clinicName:
        (item.clinicId ? clinicNameById.get(item.clinicId) : undefined) ||
        (session.user.role === 'clinic' ? session.user.clinicName : undefined) ||
        'Unknown Clinic',
      count: item._count._all,
    }));

    // Get recent activity
    const recentActivity = await prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        patientName: true,
        medicationName: true,
        clinicName: true,
        orderStatus: true,
        createdAt: true,
      },
    });

    const recentActivityDecrypted = recentActivity.map((item) =>
      decryptPHI(item as unknown as Record<string, unknown>, 'prescription') as {
        id: string;
        patientName?: string;
        medicationName?: string;
        clinicName?: string;
        orderStatus: string;
        createdAt: Date;
      }
    );

    return NextResponse.json({
      totalPrescriptions,
      totalPatients: uniquePatients.length,
      pendingPrescriptions,
      shippedPrescriptions,
      prescriptionsByClinic,
      recentActivity: recentActivityDecrypted.map((item) => ({
        id: item.id,
        patientName: item.patientName || 'N/A',
        medicationName: item.medicationName || 'N/A',
        clinicName: item.clinicName || 'N/A',
        status: item.orderStatus,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
