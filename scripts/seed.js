const { sequelize, Department, Employee, Task, Project } = require('../models');
require('dotenv').config();

const seedData = async () => {
  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');

    // Create default admin user only
    const adminEmployee = await Employee.create({
      email: 'admin@tasket.com',
      password: 'admin123',
      name: 'System Administrator',
      position: 'System Administrator',
      role: 'admin',
      phone: '+1-555-0001',
      hire_date: new Date('2020-01-01'),
      salary: 120000.00,
      is_active: true
    });
    
    console.log('✅ Admin user created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log('Email: admin@tasket.com');
    console.log('Password: admin123');
    console.log('\n💡 Use the admin account to create departments, employees, and tasks.');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

seedData();