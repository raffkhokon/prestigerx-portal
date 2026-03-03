import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'sales_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const salesRepId = searchParams.get('salesRepId');
    const pharmacyId = searchParams.get('pharmacyId');

    const floors = await prisma.salesRepPricingFloor.findMany({
      where: {
        ...(salesRepId ? { salesRepId } : {}),
        ...(pharmacyId ? { pharmacyId } : {}),
        isActive: true,
      },
      include: {
        salesRep: { select: { id: true, name: true, email: true } },
        pharmacy: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, medicationStrength: true, medicationForm: true, price: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ data: floors });
  } catch (error) {
    console.error('GET /api/sales/floors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'sales_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const items: Array<{ salesRepId: string; pharmacyId: string; productId: string; floorPrice: number }> = body?.items || [];

    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.salesRepId || !item.pharmacyId || !item.productId || !Number.isFinite(item.floorPrice)) continue;

        await tx.salesRepPricingFloor.upsert({
          where: {
            salesRepId_pharmacyId_productId: {
              salesRepId: item.salesRepId,
              pharmacyId: item.pharmacyId,
              productId: item.productId,
            },
          },
          create: {
            salesRepId: item.salesRepId,
            pharmacyId: item.pharmacyId,
            productId: item.productId,
            floorPrice: item.floorPrice,
            isActive: true,
          },
          update: {
            floorPrice: item.floorPrice,
            isActive: true,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/sales/floors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
