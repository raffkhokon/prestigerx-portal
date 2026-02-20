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

    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId') || session.user.clinicId;

    let pharmacies;
    if (session.user.role === 'admin') {
      pharmacies = await prisma.pharmacy.findMany({
        orderBy: { name: 'asc' },
        include: { clinics: { include: { clinic: true } } },
      });
    } else {
      // Clinic users see pharmacies linked to their clinic
      pharmacies = await prisma.pharmacy.findMany({
        where: {
          clinics: { some: { clinicId: clinicId || '' } },
          status: 'active',
        },
        orderBy: { name: 'asc' },
      });
    }

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      clinicId: session.user.clinicId,
      actionType: 'READ',
      resourceType: 'Pharmacy',
      details: `Listed ${pharmacies.length} pharmacies`,
    });

    return NextResponse.json({ data: pharmacies });
  } catch (error) {
    console.error('GET /api/pharmacies error:', error);
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

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: body.name,
        type: body.type || 'compounding',
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        supportedMedications: body.supportedMedications || [],
        status: body.status || 'active',
      },
    });

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'CREATE',
      resourceType: 'Pharmacy',
      resourceId: pharmacy.id,
    });

    return NextResponse.json(pharmacy, { status: 201 });
  } catch (error) {
    console.error('POST /api/pharmacies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
