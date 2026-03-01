import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

const VALID_ROLES = new Set(['admin', 'clinic', 'provider', 'pharmacy', 'sales_manager', 'sales_rep']);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (body.email && body.email !== existing.email) {
      const dupe = await prisma.user.findUnique({ where: { email: body.email } });
      if (dupe) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const nextRole = body.role ?? existing.role;
    if (body.role && !VALID_ROLES.has(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'managerId')) {
      if (nextRole !== 'sales_rep') {
        return NextResponse.json({ error: 'Only sales_rep users can have manager assignment' }, { status: 400 });
      }

      if (body.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: body.managerId },
          select: { id: true, role: true },
        });

        if (!manager || manager.role !== 'sales_manager') {
          return NextResponse.json({ error: 'managerId must reference a sales_manager user' }, { status: 400 });
        }
      }
    }

    const updateData: Record<string, unknown> = {
      ...(Object.prototype.hasOwnProperty.call(body, 'name') ? { name: body.name } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'email') ? { email: body.email } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'role') ? { role: body.role } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'clinicId') ? { clinicId: body.clinicId || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'clinicName') ? { clinicName: body.clinicName || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'status') ? { status: body.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'managerId') ? { managerId: body.managerId || null } : {}),
    };

    // If role is changed away from sales_rep, remove manager linkage automatically
    if (Object.prototype.hasOwnProperty.call(body, 'role') && body.role !== 'sales_rep') {
      updateData.managerId = null;
    }

    if (body.password && String(body.password).length >= 8) {
      updateData.passwordHash = await bcrypt.hash(String(body.password), 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicId: true,
        clinicName: true,
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
      details: `Updated user ${updated.email}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
