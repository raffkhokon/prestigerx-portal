import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: 'prestigerx-api',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/health error:', error);

    return NextResponse.json(
      {
        ok: false,
        service: 'prestigerx-api',
        db: 'disconnected',
        error: 'Database check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
