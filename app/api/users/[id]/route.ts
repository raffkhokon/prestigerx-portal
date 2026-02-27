import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (Object.prototype.hasOwnProperty.call(body, 'managerId')) {
      if (body.managerId) {
        const manager = await prisma.user.findUnique({ where: { id: body.managerId }, select: { id: true, role: true } });
        if (!manager || manager.role !== 'sales_manager') {
          return NextResponse.json({ error: 'managerId must reference a sales_manager user' }, { status: 400 });
        }
      }

      if (existing.role !== 'sales_rep') {
        return NextResponse.json({ error: 'Only sales_rep users can have manager assignment' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(Object.prototype.hasOwnProperty.call(body, 'managerId') ? { managerId: body.managerId || null } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'status') ? { status: body.status } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        managerId: true,
        status: true,
      },
    });

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      actionType: 'UPDATE',
      resourceType: 'User',
      resourceId: id,
      details: `Updated user ${updated.email} manager assignment/status`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
