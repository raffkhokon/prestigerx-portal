import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.name || !body.pharmacyId || !body.medicationStrength || !body.medicationForm) {
      return NextResponse.json(
        { error: 'Name, pharmacy, strength, and form are required' },
        { status: 400 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        pharmacyId: body.pharmacyId,
        name: body.name,
        medicationStrength: body.medicationStrength,
        medicationForm: body.medicationForm,
        type: body.type || body.medicationForm,
        description: body.description,
        price: body.price,
        status: body.status || 'active',
      },
      include: {
        pharmacy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
