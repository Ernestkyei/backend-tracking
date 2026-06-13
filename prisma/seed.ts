// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcryptModule = require('bcrypt'); // Changed variable name

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  const hashedPassword = await bcryptModule.hash('password123', 10); 
  
  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'System Admin',
      phone: '1234567890',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('✅ Admin user created:', admin.email);
  
  // Create Driver User
  const driver = await prisma.user.upsert({
    where: { email: 'driver@example.com' },
    update: {},
    create: {
      email: 'driver@example.com',
      password: hashedPassword,
      name: 'Test Driver',
      phone: '0987654321',
      role: 'DRIVER',
      isActive: true
    }
  });
  console.log('✅ Driver user created:', driver.email);
  
  // Create Regular Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: hashedPassword,
      name: 'Test Customer',
      phone: '5555555555',
      role: 'CUSTOMER',
      isActive: true
    }
  });
  console.log('✅ Customer user created:', customer.email);
  
  console.log('\n🎉 Seeding completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin:    admin@example.com / password123');
  console.log('Driver:   driver@example.com / password123');
  console.log('Customer: customer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });