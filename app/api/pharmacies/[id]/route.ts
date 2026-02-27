import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (['sales_rep', 'sales_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: { clinics: { include: { clinic: true } } },
    });
    if (!pharmacy) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pharmacy);
  } catch (error) {
    console.error('GET /api/pharmacies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.pharmacy.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        supportedMedications: body.supportedMedications,
        status: body.status,
      },
    });
    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'UPDATE',
      resourceType: 'Pharmacy',
      resourceId: id,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/pharmacies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.pharmacy.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'DELETE',
      resourceType: 'Pharmacy',
      resourceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pharmacies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
