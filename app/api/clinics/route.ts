import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sales reps/managers can only see their assigned clinics
    if (session.user.role === 'sales_rep') {
      const clinics = await prisma.clinic.findMany({
        where: { salesRepId: session.user.id },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { patients: true, prescriptions: true } },
          salesRep: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json({ data: clinics });
    }

    if (session.user.role === 'sales_manager') {
      const clinics = await prisma.clinic.findMany({
        where: {
          OR: [
            { salesRepId: session.user.id },
            { salesRep: { managerId: session.user.id } },
          ],
        },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { patients: true, prescriptions: true } },
          salesRep: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json({ data: clinics });
    }

    if (session.user.role === 'provider') {
      const assigned = await prisma.providerClinic.findMany({
        where: { providerId: session.user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          clinic: {
            include: {
              _count: { select: { patients: true, prescriptions: true } },
              salesRep: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
      return NextResponse.json({ data: assigned.map((pc) => pc.clinic) });
    }

    // Other non-admin roles can only see their own clinic
    if (session.user.role !== 'admin') {
      if (!session.user.clinicId) {
        return NextResponse.json({ data: [] });
      }
      const clinic = await prisma.clinic.findUnique({
        where: { id: session.user.clinicId },
      });
      return NextResponse.json({ data: clinic ? [clinic] : [] });
    }

    const clinics = await prisma.clinic.findMany({
      orderBy: { name: 'asc' },
      include: {
        pharmacies: { include: { pharmacy: true } },
        salesRep: { select: { id: true, name: true, email: true } },
        _count: { select: { patients: true, prescriptions: true } },
      },
    });

    return NextResponse.json({ data: clinics });
  } catch (error) {
    console.error('GET /api/clinics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const clinic = await prisma.clinic.create({
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        status: body.status || 'active',
      },
    });

    // If pharmacyIds provided, link them
    if (body.pharmacyIds?.length) {
      await prisma.clinicPharmacy.createMany({
        data: body.pharmacyIds.map((pharmacyId: string) => ({
          clinicId: clinic.id,
          pharmacyId,
        })),
      });
    }

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'CREATE',
      resourceType: 'Clinic',
      resourceId: clinic.id,
    });

    return NextResponse.json(clinic, { status: 201 });
  } catch (error) {
    console.error('POST /api/clinics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
