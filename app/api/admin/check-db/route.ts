import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Check Database Status
 * Returns user count by role (no sensitive data)
 * PUBLIC ENDPOINT - No auth required
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [adminCount, providerCount, clinicCount, totalCount] = await Promise.all([
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { role: 'provider' } }),
      prisma.user.count({ where: { role: 'clinic' } }),
      prisma.user.count(),
    ]);

    const isEmpty = totalCount === 0;

    return NextResponse.json({
      isEmpty,
      counts: {
        total: totalCount,
        admin: adminCount,
        provider: providerCount,
        clinic: clinicCount,
      },
      message: isEmpty 
        ? 'Database is empty. Run bootstrap endpoint to create initial users.'
        : 'Database has users. Old logins should work if credentials are correct.',
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
