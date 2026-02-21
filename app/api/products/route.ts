import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');

    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        ...(pharmacyId ? { pharmacyId } : {}),
      },
      include: {
        pharmacy: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error(error);
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

    if (!body.name || !body.pharmacyId) {
      return NextResponse.json({ error: 'Name and pharmacy are required' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        pharmacyId: body.pharmacyId,
        name: body.name,
        type: body.type,
        description: body.description,
        price: body.price,
        status: body.status || 'active',
      },
      include: {
        pharmacy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
