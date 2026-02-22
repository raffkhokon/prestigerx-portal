import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptPHI } from '@/lib/encryption';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildManifestHtml(rx: Record<string, unknown>) {
  const createdAt = rx.createdAt ? new Date(String(rx.createdAt)) : new Date();
  const created = createdAt.toLocaleString('en-US');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prescription Manifest ${esc(rx.id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .muted { color: #475569; font-size: 13px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
    .section { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #334155; margin-bottom: 10px; font-weight: 700; }
    .row { display: grid; grid-template-columns: 180px 1fr; gap: 8px; font-size: 14px; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: 0; }
    .label { color: #334155; font-weight: 600; }
    .value { color: #020617; }
  </style>
</head>
<body>
  <h1>Prescription Manifest</h1>
  <div class="muted">Generated ${esc(created)} • Prescription ID: ${esc(rx.id)}</div>

  <div class="card">
    <div class="section">Patient</div>
    <div class="row"><div class="label">Name</div><div class="value">${esc(rx.patientName)}</div></div>
    <div class="row"><div class="label">DOB</div><div class="value">${esc(rx.patientDob)}</div></div>
    <div class="row"><div class="label">Gender</div><div class="value">${esc(rx.patientGender)}</div></div>
    <div class="row"><div class="label">Allergies</div><div class="value">${esc(rx.patientAllergies || 'None listed')}</div></div>
  </div>

  <div class="card">
    <div class="section">Medication</div>
    <div class="row"><div class="label">Medication</div><div class="value">${esc(rx.medicationName)}</div></div>
    <div class="row"><div class="label">Strength</div><div class="value">${esc(rx.medicationStrength)}</div></div>
    <div class="row"><div class="label">Form</div><div class="value">${esc(rx.medicationForm)}</div></div>
    <div class="row"><div class="label">Quantity</div><div class="value">${esc(rx.quantity)}</div></div>
    <div class="row"><div class="label">Directions</div><div class="value">${esc(rx.directions)}</div></div>
    <div class="row"><div class="label">Refills</div><div class="value">${esc(rx.refills)}</div></div>
  </div>

  <div class="card">
    <div class="section">Provider & Fulfillment</div>
    <div class="row"><div class="label">Provider</div><div class="value">${esc(rx.providerName)}</div></div>
    <div class="row"><div class="label">Clinic</div><div class="value">${esc(rx.clinicName)}</div></div>
    <div class="row"><div class="label">Pharmacy</div><div class="value">${esc(rx.pharmacyName)}</div></div>
    <div class="row"><div class="label">Order Status</div><div class="value">${esc(rx.orderStatus)}</div></div>
    <div class="row"><div class="label">Payment Status</div><div class="value">${esc(rx.paymentStatus)}</div></div>
    <div class="row"><div class="label">Shipping Method</div><div class="value">${esc(rx.shippingMethod)}</div></div>
  </div>
</body>
</html>`;
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
      include: {
        clinic: { select: { name: true } },
        pharmacy: { select: { name: true } },
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
    ) as Record<string, unknown>;

    const html = buildManifestHtml({
      ...decrypted,
      clinicName: prescription.clinic?.name || decrypted.clinicName,
      pharmacyName: prescription.pharmacy?.name || decrypted.pharmacyName,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('GET /api/prescriptions/[id]/manifest error:', error);
    return NextResponse.json(
      { error: 'Unable to load manifest' },
      { status: 500 }
    );
  }
}
