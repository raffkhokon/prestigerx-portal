import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint: Check if users exist
 * Returns count only (no sensitive data)
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const adminExists = await prisma.user.findFirst({
      where: { email: 'Raff@patientacquisition.ai' },
      select: { id: true, email: true, role: true, createdAt: true }
    });

    return NextResponse.json({
      totalUsers,
      raffAccountExists: !!adminExists,
      raffAccountDetails: adminExists ? {
        email: adminExists.email,
        role: adminExists.role,
        createdAt: adminExists.createdAt
      } : null,
      message: totalUsers === 0 
        ? 'Database is empty - run bootstrap'
        : adminExists
          ? 'Your account exists - password might be wrong or session issue'
          : `${totalUsers} users exist, but Raff@patientacquisition.ai is not one of them`
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
