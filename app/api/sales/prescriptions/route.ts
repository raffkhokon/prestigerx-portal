import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SALES_ROLES = new Set(['sales_rep', 'sales_manager', 'admin']);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!SALES_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let clinicIds: string[] | null = null;

    if (session.user.role === 'sales_rep') {
      const clinics = await prisma.clinic.findMany({
        where: { salesRepId: session.user.id },
        select: { id: true },
      });
      clinicIds = clinics.map((c) => c.id);
    }

    if (session.user.role === 'sales_manager') {
      const reps = await prisma.user.findMany({
        where: { managerId: session.user.id, role: 'sales_rep' },
        select: { id: true },
      });
      const repIds = reps.map((r) => r.id);

      if (repIds.length === 0) clinicIds = [];
      else {
        const clinics = await prisma.clinic.findMany({
          where: { salesRepId: { in: repIds } },
          select: { id: true },
        });
        clinicIds = clinics.map((c) => c.id);
      }
    }

    const where: Record<string, unknown> = {};
    if (clinicIds) where.clinicId = { in: clinicIds };

    const [rows, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clinicId: true,
          clinicName: true,
          amount: true,
          paymentStatus: true,
          orderStatus: true,
          createdAt: true,
          pharmacy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      scope: session.user.role,
    });
  } catch (error) {
    console.error('GET /api/sales/prescriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
