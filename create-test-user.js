const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'admin@prestigescripts.com';
  const password = 'Test123!@#';
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Admin User',
        role: 'admin',
        status: 'active',
        clinicName: 'Test Clinic',
      },
    });
    
    console.log('✅ Test user created:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log(`   ID: ${user.id}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ User already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
