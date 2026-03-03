import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId');
    const pharmacyId = searchParams.get('pharmacyId');
    const productId = searchParams.get('productId');

    if (!clinicId || !pharmacyId || !productId) {
      return NextResponse.json({ error: 'clinicId, pharmacyId, and productId are required' }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, salesRepId: true } });
    if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

    if (!clinic.salesRepId) {
      return NextResponse.json({ data: null });
    }

    const offer = await prisma.accountCatalogPrice.findFirst({
      where: {
        scopeType: 'clinic',
        scopeId: clinic.id,
        salesRepId: clinic.salesRepId,
        pharmacyId,
        productId,
        isActive: true,
      },
      select: { id: true, offeredPrice: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ data: offer || null });
  } catch (error) {
    console.error('GET /api/pricing/offer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
