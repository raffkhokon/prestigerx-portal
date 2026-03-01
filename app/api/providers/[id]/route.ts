import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!existing || existing.role !== 'provider') {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (body.email && body.email !== existing.email) {
      const dupe = await prisma.user.findUnique({ where: { email: body.email } });
      if (dupe) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const updateData: Record<string, unknown> = {
      ...(Object.prototype.hasOwnProperty.call(body, 'name') ? { name: body.name } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'email') ? { email: body.email } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'npi') ? { npi: body.npi || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'dea') ? { dea: body.dea || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'license') ? { license: body.license || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'phone') ? { phone: body.phone || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'practice') ? { practice: body.practice || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'status') ? { status: body.status } : {}),
    };

    if (body.password && String(body.password).length >= 8) {
      updateData.passwordHash = await bcrypt.hash(String(body.password), 10);
    }

    const provider = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        npi: true,
        dea: true,
        license: true,
        phone: true,
        practice: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, provider });
  } catch (error) {
    console.error('Error updating provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}
