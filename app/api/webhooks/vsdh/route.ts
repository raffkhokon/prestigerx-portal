import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(req: NextRequest) {
  const configuredSecret = process.env.VSDH_WEBHOOK_SECRET || process.env.VSDIGITAL_WEBHOOK_SECRET;
  if (!configuredSecret) return true; // allow in sandbox until secret is configured

  const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-vsdh-webhook-secret');
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;

  return headerSecret === configuredSecret || bearer === configuredSecret;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventType = String((body as any)?.event || (body as any)?.type || 'unknown');
    const orderId = String((body as any)?.data?.id || (body as any)?.orderId || '');

    await prisma.auditLog.create({
      data: {
        userEmail: 'vsdh-webhook@system.local',
        userRole: 'system',
        actionType: 'WEBHOOK',
        resourceType: 'VSDHWebhook',
        resourceId: orderId || undefined,
        details: JSON.stringify({
          eventType,
          orderId: orderId || null,
          receivedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/webhooks/vsdh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
