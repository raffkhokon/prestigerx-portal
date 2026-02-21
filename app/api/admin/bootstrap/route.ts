import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Bootstrap Admin User
 * One-time endpoint to create initial admin account
 * 
 * SECURITY: This endpoint should be disabled after first use
 * or protected with a secret token
 */
export async function POST(req: Request) {
  try {
    // Optional: Add secret token check
    const { secret } = await req.json();
    const expectedSecret = process.env.BOOTSTRAP_SECRET || 'bootstrap-2026';
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid bootstrap secret' }, { status: 401 });
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return NextResponse.json({ 
        error: 'Admin user already exists',
        email: existingAdmin.email 
      }, { status: 400 });
    }

    // Create admin user
    const adminEmail = 'Raff@patientacquisition.ai';
    const adminPassword = 'Px#2026$SecRaff!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: 'Raff (Admin)',
        role: 'admin',
        status: 'active',
      },
    });

    console.log('✅ Admin user created:', admin.email);

    // Create test provider
    const providerEmail = 'provider@test.com';
    const providerPassword = 'Provider123!';
    const providerPasswordHash = await bcrypt.hash(providerPassword, 12);

    const provider = await prisma.user.create({
      data: {
        email: providerEmail,
        passwordHash: providerPasswordHash,
        name: 'Dr. Test Provider',
        role: 'provider',
        status: 'active',
        npi: '1234567890',
        dea: 'BP1234567',
        license: 'MD12345',
        phone: '5555551234',
        practice: 'Test Family Medicine',
      },
    });

    console.log('✅ Test provider created:', provider.email);

    // Create test clinic
    const clinic = await prisma.clinic.create({
      data: {
        id: 'clinic_test_001',
        name: 'Test Health Center',
        address: '123 Main St, City, ST 12345',
        phone: '5555559999',
        email: 'billing@testhealthcenter.com',
        status: 'active',
      },
    });

    console.log('✅ Test clinic created:', clinic.name);

    // Create clinic user
    const clinicUserEmail = 'clinic@test.com';
    const clinicUserPassword = 'Clinic123!';
    const clinicUserPasswordHash = await bcrypt.hash(clinicUserPassword, 12);

    const clinicUser = await prisma.user.create({
      data: {
        email: clinicUserEmail,
        passwordHash: clinicUserPasswordHash,
        name: 'Test Clinic User',
        role: 'clinic',
        status: 'active',
        clinicId: clinic.id,
        clinicName: clinic.name,
      },
    });

    console.log('✅ Clinic user created:', clinicUser.email);

    // Assign provider to clinic
    await prisma.providerClinic.create({
      data: {
        providerId: provider.id,
        clinicId: clinic.id,
      },
    });

    console.log('✅ Provider assigned to clinic');

    return NextResponse.json({
      success: true,
      message: 'Database bootstrapped successfully',
      users: [
        { email: adminEmail, password: adminPassword, role: 'admin' },
        { email: providerEmail, password: providerPassword, role: 'provider' },
        { email: clinicUserEmail, password: clinicUserPassword, role: 'clinic' },
      ]
    });

  } catch (error) {
    console.error('Bootstrap error:', error);
    return NextResponse.json({ 
      error: 'Bootstrap failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
