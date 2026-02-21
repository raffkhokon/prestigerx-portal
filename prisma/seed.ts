import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'Raff@patientacquisition.ai';
  const adminPassword = 'Px#2026$SecRaff!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
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

  const provider = await prisma.user.upsert({
    where: { email: providerEmail },
    update: {},
    create: {
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
  const clinic = await prisma.clinic.upsert({
    where: { id: 'clinic_test_001' },
    update: {},
    create: {
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

  const clinicUser = await prisma.user.upsert({
    where: { email: clinicUserEmail },
    update: {},
    create: {
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
  await prisma.providerClinic.upsert({
    where: {
      providerId_clinicId: {
        providerId: provider.id,
        clinicId: clinic.id,
      },
    },
    update: {},
    create: {
      providerId: provider.id,
      clinicId: clinic.id,
    },
  });

  console.log('✅ Provider assigned to clinic');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('\nProvider:');
  console.log(`  Email: ${providerEmail}`);
  console.log(`  Password: ${providerPassword}`);
  console.log('\nClinic User:');
  console.log(`  Email: ${clinicUserEmail}`);
  console.log(`  Password: ${clinicUserPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
