import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVSDigitalClientHealth } from '@/lib/vsdigital';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const whereVSD = {
      OR: [
        { pharmacy: { name: { contains: 'vsdigital', mode: 'insensitive' as const } } },
        { pharmacy: { apiUrl: { contains: 'vsdigital', mode: 'insensitive' as const } } },
      ],
    };

    const [
      totalTracked,
      pending,
      sending,
      sent,
      failed,
      failedRetries,
      recentAttempts,
      lastWebhook,
      recentFailures,
    ] = await Promise.all([
      prisma.prescription.count({ where: whereVSD }),
      prisma.prescription.count({ where: { ...whereVSD, apiStatus: 'pending' } }),
      prisma.prescription.count({ where: { ...whereVSD, apiStatus: 'sending' } }),
      prisma.prescription.count({ where: { ...whereVSD, apiStatus: 'sent' } }),
      prisma.prescription.count({ where: { ...whereVSD, apiStatus: 'failed' } }),
      prisma.prescription.count({ where: { ...whereVSD, apiStatus: 'failed', apiRetryCount: { gt: 0 } } }),
      prisma.prescription.findMany({
        where: {
          ...whereVSD,
          apiStatus: { in: ['sending', 'sent', 'failed'] },
        },
        select: {
          id: true,
          apiStatus: true,
          apiSentAt: true,
          apiLastRetry: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      }),
      prisma.auditLog.findFirst({
        where: { resourceType: 'VSDHWebhook' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.prescription.findMany({
        where: { ...whereVSD, apiStatus: 'failed' },
        select: {
          id: true,
          patientName: true,
          clinicName: true,
          apiError: true,
          apiRetryCount: true,
          updatedAt: true,
          pharmacy: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const lastAttempt = recentAttempts[0] || null;

    return NextResponse.json({
      client: getVSDigitalClientHealth(),
      dispatch: {
        totalTracked,
        pending,
        sending,
        sent,
        failed,
        failedRetries,
        lastAttemptAt:
          lastAttempt?.apiSentAt?.toISOString?.() ||
          lastAttempt?.apiLastRetry?.toISOString?.() ||
          lastAttempt?.updatedAt?.toISOString?.() ||
          null,
      },
      webhooks: {
        lastReceivedAt: lastWebhook?.createdAt?.toISOString?.() || null,
      },
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        patientName: f.patientName,
        clinicName: f.clinicName,
        pharmacyName: f.pharmacy?.name || null,
        apiError: f.apiError,
        apiRetryCount: f.apiRetryCount,
        updatedAt: f.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/integrations/vsdh/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
