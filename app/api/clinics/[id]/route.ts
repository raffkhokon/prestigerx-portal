import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (session.user.role !== 'admin') {
      if (session.user.role === 'sales_rep') {
        const assigned = await prisma.clinic.findFirst({ where: { id, salesRepId: session.user.id }, select: { id: true } });
        if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } else if (session.user.role === 'sales_manager') {
        const assigned = await prisma.clinic.findFirst({
          where: {
            id,
            OR: [
              { salesRepId: session.user.id },
              { salesRep: { managerId: session.user.id } },
            ],
          },
          select: { id: true },
        });
        if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } else if (session.user.clinicId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: { pharmacies: { include: { pharmacy: true } } },
    });
    if (!clinic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(clinic);
  } catch (error) {
    console.error(error);
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
    const updated = await prisma.clinic.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        status: body.status,
      },
    });
    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'UPDATE',
      resourceType: 'Clinic',
      resourceId: id,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
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
    await prisma.clinic.delete({ where: { id } });
    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'DELETE',
      resourceType: 'Clinic',
      resourceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
