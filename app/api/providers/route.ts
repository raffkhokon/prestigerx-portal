import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: Record<string, unknown> = {};
    if (session.user.role !== 'admin') {
      where.clinicId = session.user.clinicId;
    }

    const providers = await prisma.provider.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Auto-assign clinic from session if not provided
    if (!body.clinicId && session.user.clinicId) {
      body.clinicId = session.user.clinicId;
    }

    const provider = await prisma.provider.create({
      data: {
        clinicId: body.clinicId,
        name: body.name,
        npi: body.npi,
        license: body.license,
        phone: body.phone,
        practice: body.practice,
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
