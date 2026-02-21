import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: Record<string, unknown> = {
      role: 'provider', // Only get users with provider role
      status: 'active',
    };

    // Providers are now Users with role='provider'
    const providers = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
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
        createdAt: true,
        clinics: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            prescriptions: true,
          }
        }
      },
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

// POST - Create new provider (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, npi, dea, license, phone, practice, password, clinicIds } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create provider user
    const provider = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'provider',
        npi,
        dea,
        license,
        phone,
        practice,
        status: 'active',
      },
    });

    // Assign to clinics if provided
    if (clinicIds && Array.isArray(clinicIds) && clinicIds.length > 0) {
      await prisma.providerClinic.createMany({
        data: clinicIds.map((clinicId: string) => ({
          providerId: provider.id,
          clinicId,
          status: 'active',
        })),
      });
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
      },
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
