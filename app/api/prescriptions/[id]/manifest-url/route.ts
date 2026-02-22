import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptPHI } from '@/lib/encryption';

const MANIFEST_BUCKET =
  process.env.GCS_MANIFEST_BUCKET ||
  'onlyscripts-1752528969.firebasestorage.app';

function buildObjectPath(id: string, patientName?: string, createdAt?: Date | string) {
  const patientSlug = (patientName || 'Patient')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '');

  const datePart = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '';
  const filename = `${patientSlug}${datePart ? `_${datePart}` : ''}.pdf`;

  return `prescriptions/${id}/${filename}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: {
        id: true,
        clinicId: true,
        createdAt: true,
        patientName: true,
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && prescription.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const decrypted = decryptPHI(
      prescription as unknown as Record<string, unknown>,
      'prescription'
    ) as { patientName?: string; createdAt?: string };

    const objectPath = buildObjectPath(
      prescription.id,
      decrypted.patientName || prescription.patientName || undefined,
      decrypted.createdAt || prescription.createdAt
    );

    const storage = new Storage();
    const file = storage.bucket(MANIFEST_BUCKET).file(objectPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
    }

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('GET /api/prescriptions/[id]/manifest-url error:', error);
    return NextResponse.json(
      { error: 'Unable to generate secure manifest link' },
      { status: 500 }
    );
  }
}
