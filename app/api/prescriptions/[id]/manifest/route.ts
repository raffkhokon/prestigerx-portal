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
  const patientAddress = [rx.patientStreetAddress, rx.patientCity, rx.patientState, rx.patientZipCode]
    .filter(Boolean)
    .join(', ');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prescription Manifest ${esc(rx.id)}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --line: #e2e8f0;
      --soft: #f8fafc;
      --blue-soft: #eff6ff;
      --green-soft: #ecfdf5;
      --brand: #1d4ed8;
      --brand-2: #059669;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f1f5f9;
      color: var(--ink);
      font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;
      padding: 24px;
    }
    .manifest {
      max-width: 980px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
    }
    .header {
      padding: 24px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
    }
    .title { font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
    .subtitle { margin: 0; opacity: .85; font-size: 13px; }
    .pill {
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.2);
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--soft);
    }
    .status-card {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--line);
      font-size: 13px;
      background: #fff;
    }
    .status-card.order { border-left: 4px solid var(--brand); background: var(--blue-soft); }
    .status-card.payment { border-left: 4px solid var(--brand-2); background: var(--green-soft); }
    .section-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      padding: 20px 24px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }
    .card h3 {
      margin: 0;
      padding: 12px 14px;
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #334155;
      background: #f8fafc;
      border-bottom: 1px solid var(--line);
    }
    .rows { padding: 6px 14px; }
    .row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .row:last-child { border-bottom: 0; }
    .label { color: var(--muted); font-weight: 600; }
    .value { color: #020617; font-weight: 500; }
    .full { grid-column: 1 / -1; }
    .footer {
      border-top: 1px solid var(--line);
      padding: 12px 24px 18px;
      color: #64748b;
      font-size: 12px;
      background: #fcfdff;
    }
    @media (max-width: 860px) {
      .status-bar, .section-grid { grid-template-columns: 1fr; }
      .header { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="manifest">
    <header class="header">
      <div>
        <h1 class="title">Prescription Manifest</h1>
        <p class="subtitle">Generated ${esc(created)}</p>
      </div>
      <div class="pill">RX ID: ${esc(rx.id)}</div>
    </header>

    <section class="status-bar">
      <div class="status-card order"><strong>Order Status:</strong> ${esc(rx.orderStatus || 'Pending')}</div>
      <div class="status-card payment"><strong>Payment Status:</strong> ${esc(rx.paymentStatus || 'Pending')}</div>
    </section>

    <section class="section-grid">
      <article class="card">
        <h3>Patient Information</h3>
        <div class="rows">
          <div class="row"><div class="label">Name</div><div class="value">${esc(rx.patientName)}</div></div>
          <div class="row"><div class="label">Date of Birth</div><div class="value">${esc(rx.patientDob)}</div></div>
          <div class="row"><div class="label">Gender</div><div class="value">${esc(rx.patientGender)}</div></div>
          <div class="row"><div class="label">Phone</div><div class="value">${esc(rx.patientPhone)}</div></div>
          <div class="row"><div class="label">Email</div><div class="value">${esc(rx.patientEmail)}</div></div>
          <div class="row"><div class="label">Address</div><div class="value">${esc(patientAddress || '—')}</div></div>
          <div class="row"><div class="label">Allergies</div><div class="value">${esc(rx.patientAllergies || 'None listed')}</div></div>
        </div>
      </article>

      <article class="card">
        <h3>Medication Details</h3>
        <div class="rows">
          <div class="row"><div class="label">Medication</div><div class="value">${esc(rx.medicationName)}</div></div>
          <div class="row"><div class="label">Strength</div><div class="value">${esc(rx.medicationStrength)}</div></div>
          <div class="row"><div class="label">Form</div><div class="value">${esc(rx.medicationForm)}</div></div>
          <div class="row"><div class="label">Quantity</div><div class="value">${esc(rx.quantity)}</div></div>
          <div class="row"><div class="label">Refills</div><div class="value">${esc(rx.refills)}</div></div>
          <div class="row full"><div class="label">Directions</div><div class="value">${esc(rx.directions)}</div></div>
        </div>
      </article>

      <article class="card">
        <h3>Provider</h3>
        <div class="rows">
          <div class="row"><div class="label">Name</div><div class="value">${esc(rx.providerName)}</div></div>
          <div class="row"><div class="label">NPI</div><div class="value">${esc(rx.providerNpi)}</div></div>
          <div class="row"><div class="label">Phone</div><div class="value">${esc(rx.providerPhone)}</div></div>
        </div>
      </article>

      <article class="card">
        <h3>Pharmacy & Shipping</h3>
        <div class="rows">
          <div class="row"><div class="label">Clinic</div><div class="value">${esc(rx.clinicName)}</div></div>
          <div class="row"><div class="label">Pharmacy</div><div class="value">${esc(rx.pharmacyName)}</div></div>
          <div class="row"><div class="label">Shipping Method</div><div class="value">${esc(rx.shippingMethod)}</div></div>
          <div class="row"><div class="label">Tracking #</div><div class="value">${esc(rx.trackingNumber || '—')}</div></div>
          <div class="row"><div class="label">Carrier</div><div class="value">${esc(rx.trackingCarrier || '—')}</div></div>
        </div>
      </article>
    </section>

    <footer class="footer">
      Internal Rx manifest • PHI protected • Generated by PrestigeScripts
    </footer>
  </main>
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
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            email: true,
            allergies: true,
            streetAddress: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
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

    const decryptedPatient = prescription.patient
      ? (decryptPHI(
          prescription.patient as unknown as Record<string, unknown>,
          'patient'
        ) as Record<string, unknown>)
      : {};

    const patientName = [decryptedPatient.firstName, decryptedPatient.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const html = buildManifestHtml({
      ...decrypted,
      clinicName: prescription.clinic?.name || decrypted.clinicName,
      pharmacyName: prescription.pharmacy?.name || decrypted.pharmacyName,
      patientName: decrypted.patientName || patientName,
      patientDob: decrypted.patientDob || decryptedPatient.dateOfBirth,
      patientGender: decrypted.patientGender || decryptedPatient.gender,
      patientAllergies: decrypted.patientAllergies || decryptedPatient.allergies,
      patientPhone: decrypted.patientPhone || decryptedPatient.phone,
      patientEmail: decrypted.patientEmail || decryptedPatient.email,
      patientStreetAddress: decrypted.patientStreetAddress || decryptedPatient.streetAddress,
      patientCity: decrypted.patientCity || decryptedPatient.city,
      patientState: decrypted.patientState || decryptedPatient.state,
      patientZipCode: decrypted.patientZipCode || decryptedPatient.zipCode,
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
