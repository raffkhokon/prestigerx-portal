import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SALES_ROLES = new Set(['sales_rep', 'sales_manager', 'admin']);

async function getAccessibleClinicIds(userId: string, role: string) {
  if (role === 'admin') return null;

  if (role === 'sales_rep') {
    const clinics = await prisma.clinic.findMany({ where: { salesRepId: userId }, select: { id: true } });
    return clinics.map((c) => c.id);
  }

  if (role === 'sales_manager') {
    const reps = await prisma.user.findMany({ where: { managerId: userId, role: 'sales_rep' }, select: { id: true } });
    const repIds = reps.map((r) => r.id);
    if (!repIds.length) return [];
    const clinics = await prisma.clinic.findMany({ where: { salesRepId: { in: repIds } }, select: { id: true } });
    return clinics.map((c) => c.id);
  }

  return [];
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SALES_ROLES.has(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId');
    const pharmacyId = searchParams.get('pharmacyId');

    if (!clinicId || !pharmacyId) {
      return NextResponse.json({ error: 'clinicId and pharmacyId are required' }, { status: 400 });
    }

    const accessible = await getAccessibleClinicIds(session.user.id, session.user.role);
    if (accessible && !accessible.includes(clinicId)) {
      return NextResponse.json({ error: 'Forbidden clinic scope' }, { status: 403 });
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true, salesRepId: true } });
    if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

    const repId = clinic.salesRepId || session.user.id;

    const [products, floors, offers] = await Promise.all([
      prisma.product.findMany({ where: { pharmacyId, status: 'active' }, orderBy: { name: 'asc' } }),
      prisma.salesRepPricingFloor.findMany({ where: { salesRepId: repId, pharmacyId, isActive: true } }),
      prisma.accountCatalogPrice.findMany({ where: { scopeType: 'clinic', scopeId: clinicId, salesRepId: repId, pharmacyId, isActive: true } }),
    ]);

    const floorByProduct = new Map(floors.map((f) => [f.productId, f.floorPrice]));
    const offerByProduct = new Map(offers.map((o) => [o.productId, o.offeredPrice]));

    const rows = products.map((p) => ({
      productId: p.id,
      name: p.name,
      strength: p.medicationStrength,
      form: p.medicationForm,
      basePrice: p.price || 0,
      floorPrice: floorByProduct.get(p.id) ?? null,
      offeredPrice: offerByProduct.get(p.id) ?? null,
    }));

    return NextResponse.json({
      data: rows,
      context: {
        clinicId,
        clinicName: clinic.name,
        pharmacyId,
        salesRepId: repId,
      },
    });
  } catch (error) {
    console.error('GET /api/sales/catalog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SALES_ROLES.has(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const clinicId: string = body?.clinicId;
    const pharmacyId: string = body?.pharmacyId;
    const items: Array<{ productId: string; offeredPrice: number }> = body?.items || [];

    if (!clinicId || !pharmacyId || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'clinicId, pharmacyId and items are required' }, { status: 400 });
    }

    const accessible = await getAccessibleClinicIds(session.user.id, session.user.role);
    if (accessible && !accessible.includes(clinicId)) {
      return NextResponse.json({ error: 'Forbidden clinic scope' }, { status: 403 });
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { salesRepId: true } });
    if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

    const repId = clinic.salesRepId || session.user.id;

    const floorRows = await prisma.salesRepPricingFloor.findMany({
      where: {
        salesRepId: repId,
        pharmacyId,
        productId: { in: items.map((i) => i.productId) },
        isActive: true,
      },
    });
    const floors = new Map(floorRows.map((f) => [f.productId, f.floorPrice]));

    for (const item of items) {
      if (!Number.isFinite(item.offeredPrice) || item.offeredPrice < 0) {
        return NextResponse.json({ error: `Invalid offered price for product ${item.productId}` }, { status: 400 });
      }

      const floor = floors.get(item.productId);
      if (floor == null) {
        return NextResponse.json({ error: `Missing rep floor price for product ${item.productId}` }, { status: 400 });
      }
      if (item.offeredPrice < floor) {
        return NextResponse.json({ error: `Offered price below floor for product ${item.productId}` }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const floor = floors.get(item.productId) ?? null;
        await tx.accountCatalogPrice.upsert({
          where: {
            scopeType_scopeId_salesRepId_pharmacyId_productId: {
              scopeType: 'clinic',
              scopeId: clinicId,
              salesRepId: repId,
              pharmacyId,
              productId: item.productId,
            },
          },
          create: {
            scopeType: 'clinic',
            scopeId: clinicId,
            salesRepId: repId,
            pharmacyId,
            productId: item.productId,
            offeredPrice: item.offeredPrice,
            floorPriceSnapshot: floor,
            isActive: true,
          },
          update: {
            offeredPrice: item.offeredPrice,
            floorPriceSnapshot: floor,
            isActive: true,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/sales/catalog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
