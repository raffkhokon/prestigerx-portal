import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type MappingInput = {
  productId?: string;
  localProductName?: string;
  externalSku?: string;
  externalNdc?: string;
  externalCode?: string;
  isActive?: boolean;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (['sales_rep', 'sales_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: pharmacyId } = await params;

    const mappings = await prisma.pharmacyProductMapping.findMany({
      where: { pharmacyId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            medicationStrength: true,
            medicationForm: true,
            status: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ data: mappings });
  } catch (error) {
    console.error('GET /api/pharmacies/[id]/mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: pharmacyId } = await params;
    const body = await req.json();
    const mappings: MappingInput[] = Array.isArray(body?.mappings) ? body.mappings : [];

    if (!mappings.length) {
      return NextResponse.json({ error: 'No mappings provided' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of mappings) {
        const localProductName = (item.localProductName || '').trim();
        if (!localProductName) continue;

        await tx.pharmacyProductMapping.upsert({
          where: {
            pharmacyId_localProductName: {
              pharmacyId,
              localProductName,
            },
          },
          update: {
            productId: item.productId || null,
            externalSku: item.externalSku?.trim() || null,
            externalNdc: item.externalNdc?.trim() || null,
            externalCode: item.externalCode?.trim() || null,
            isActive: item.isActive ?? true,
          },
          create: {
            pharmacyId,
            productId: item.productId || null,
            localProductName,
            externalSku: item.externalSku?.trim() || null,
            externalNdc: item.externalNdc?.trim() || null,
            externalCode: item.externalCode?.trim() || null,
            isActive: item.isActive ?? true,
          },
        });
      }
    });

    const updated = await prisma.pharmacyProductMapping.findMany({
      where: { pharmacyId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/pharmacies/[id]/mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
