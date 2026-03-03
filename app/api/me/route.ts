import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    clinicId: session.user.clinicId ?? null,
    clinicName: session.user.clinicName ?? null,
    name: session.user.name ?? null,
  });
}
