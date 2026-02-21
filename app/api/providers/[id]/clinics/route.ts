import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Providers can only see their own clinics, admins can see anyone's
    if (session.user.role !== 'admin' && session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get assigned clinics for this provider
    const providerClinics = await prisma.providerClinic.findMany({
      where: {
        providerId: params.id,
        status: 'active',
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    });

    const clinics = providerClinics.map((pc) => pc.clinic);

    return NextResponse.json({ clinics });
  } catch (error) {
    console.error('Error fetching provider clinics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinics' },
      { status: 500 }
    );
  }
}

// POST - Assign provider to clinic (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinicId } = await req.json();

    if (!clinicId) {
      return NextResponse.json(
        { error: 'clinicId is required' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existing = await prisma.providerClinic.findUnique({
      where: {
        providerId_clinicId: {
          providerId: params.id,
          clinicId,
        },
      },
    });

    if (existing) {
      // Reactivate if inactive
      if (existing.status === 'inactive') {
        await prisma.providerClinic.update({
          where: { id: existing.id },
          data: { status: 'active' },
        });
        return NextResponse.json({ message: 'Clinic assignment reactivated' });
      }
      return NextResponse.json(
        { error: 'Provider already assigned to this clinic' },
        { status: 400 }
      );
    }

    // Create new assignment
    await prisma.providerClinic.create({
      data: {
        providerId: params.id,
        clinicId,
        status: 'active',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning provider to clinic:', error);
    return NextResponse.json(
      { error: 'Failed to assign clinic' },
      { status: 500 }
    );
  }
}
