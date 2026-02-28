import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get prescriptions by clinic
    const prescriptionsByClinicRaw = await prisma.prescription.groupBy({
      by: ['clinicId', 'clinicName'],
      where,
      _count: true,
    });

    const prescriptionsByClinic = prescriptionsByClinicRaw.map((item) => ({
      clinicName: item.clinicName || 'Unknown Clinic',
      count: item._count,
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

    return NextResponse.json({
      totalPrescriptions,
      totalPatients: uniquePatients.length,
      pendingPrescriptions,
      shippedPrescriptions,
      prescriptionsByClinic,
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        patientName: item.patientName,
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
