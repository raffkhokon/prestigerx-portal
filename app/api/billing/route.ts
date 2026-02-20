import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (session.user.role !== 'admin') {
      where.clinicId = session.user.clinicId;
    }

    const [transactions, total] = await Promise.all([
      prisma.billingTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          prescription: {
            select: { id: true, patientName: true, medicationName: true, orderStatus: true },
          },
        },
      }),
      prisma.billingTransaction.count({ where }),
    ]);

    // Calculate totals
    const totals = await prisma.billingTransaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      clinicId: session.user.clinicId,
      actionType: 'READ',
      resourceType: 'BillingTransaction',
    });

    return NextResponse.json({
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totals: {
        totalAmount: totals._sum.amount || 0,
        totalTransactions: totals._count,
      },
    });
  } catch (error) {
    console.error(error);
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
    const transaction = await prisma.billingTransaction.create({
      data: {
        prescriptionId: body.prescriptionId,
        clinicId: body.clinicId,
        clinicName: body.clinicName,
        type: body.type || 'prescription',
        amount: body.amount || 0,
        status: body.status || 'pending',
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
