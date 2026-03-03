import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SALES_ROLES = new Set(['sales_rep', 'sales_manager', 'admin']);

function parseDate(value: string | null, end = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SALES_ROLES.has(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'), true);

    let clinicIds: string[] | null = null;

    if (session.user.role === 'sales_rep') {
      const clinics = await prisma.clinic.findMany({ where: { salesRepId: session.user.id }, select: { id: true } });
      clinicIds = clinics.map((c) => c.id);
    } else if (session.user.role === 'sales_manager') {
      const reps = await prisma.user.findMany({ where: { managerId: session.user.id, role: 'sales_rep' }, select: { id: true } });
      const repIds = reps.map((r) => r.id);
      if (repIds.length === 0) clinicIds = [];
      else {
        const clinics = await prisma.clinic.findMany({ where: { salesRepId: { in: repIds } }, select: { id: true, salesRepId: true } });
        clinicIds = clinics.map((c) => c.id);
      }
    }

    const where: any = {
      paymentStatus: { in: ['paid', 'Payment Successful'] },
    };
    if (clinicIds) where.clinicId = { in: clinicIds };
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      select: {
        id: true,
        amount: true,
        floorPriceSnapshot: true,
        clinicId: true,
        clinicName: true,
        pharmacyId: true,
        createdAt: true,
        clinic: { select: { salesRepId: true, salesRep: { select: { id: true, name: true } } } },
        pharmacy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const kpis = {
      orders: prescriptions.length,
      revenue: 0,
      profit: 0,
      avgMarginPct: 0,
    };

    const byRep = new Map<string, { repId: string; repName: string; orders: number; revenue: number; profit: number }>();
    const byClinic = new Map<string, { clinicId: string; clinicName: string; orders: number; revenue: number; profit: number }>();
    const byPharmacy = new Map<string, { pharmacyId: string; pharmacyName: string; orders: number; revenue: number; profit: number }>();

    for (const rx of prescriptions) {
      const revenue = Number(rx.amount || 0);
      const floor = Number(rx.floorPriceSnapshot || 0);
      const profit = Math.max(0, revenue - floor);

      kpis.revenue += revenue;
      kpis.profit += profit;

      const repId = rx.clinic?.salesRep?.id || 'unassigned';
      const repName = rx.clinic?.salesRep?.name || 'Unassigned';
      const rep = byRep.get(repId) || { repId, repName, orders: 0, revenue: 0, profit: 0 };
      rep.orders += 1;
      rep.revenue += revenue;
      rep.profit += profit;
      byRep.set(repId, rep);

      const clinicId = rx.clinicId || 'unknown';
      const clinicName = rx.clinicName || 'Unknown';
      const clinic = byClinic.get(clinicId) || { clinicId, clinicName, orders: 0, revenue: 0, profit: 0 };
      clinic.orders += 1;
      clinic.revenue += revenue;
      clinic.profit += profit;
      byClinic.set(clinicId, clinic);

      const pharmacyId = rx.pharmacy?.id || 'unknown';
      const pharmacyName = rx.pharmacy?.name || 'Unknown';
      const pharmacy = byPharmacy.get(pharmacyId) || { pharmacyId, pharmacyName, orders: 0, revenue: 0, profit: 0 };
      pharmacy.orders += 1;
      pharmacy.revenue += revenue;
      pharmacy.profit += profit;
      byPharmacy.set(pharmacyId, pharmacy);
    }

    kpis.avgMarginPct = kpis.revenue > 0 ? (kpis.profit / kpis.revenue) * 100 : 0;

    return NextResponse.json({
      kpis,
      byRep: Array.from(byRep.values()).sort((a, b) => b.revenue - a.revenue),
      byClinic: Array.from(byClinic.values()).sort((a, b) => b.revenue - a.revenue),
      byPharmacy: Array.from(byPharmacy.values()).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (error) {
    console.error('GET /api/sales/rollups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
