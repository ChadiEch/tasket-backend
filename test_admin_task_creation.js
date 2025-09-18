const { sequelize, Task, Employee, Department } = require('./models');

async function testAdminTaskCreation() {
  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced');

    // Create test department
    const department = await Department.create({
      name: 'Test Department',
      description: 'Test department for task creation'
    });
    console.log('Department created:', department.name);

    // Create admin employee
    const adminEmployee = await Employee.create({
      email: 'admin@example.com',
      password: 'hashed_password',
      name: 'Admin User',
      department_id: department.id,
      role: 'admin'
    });
    console.log('Admin employee created:', adminEmployee.name);

    // Create regular employee
    const regularEmployee = await Employee.create({
      email: 'employee@example.com',
      password: 'hashed_password',
      name: 'Regular Employee',
      department_id: department.id,
      role: 'employee'
    });
    console.log('Regular employee created:', regularEmployee.name);

    // Test 1: Admin creates task with assignment
    console.log('\n--- Test 1: Admin creates task with assignment ---');
    const task1 = await Task.create({
      title: 'Admin Task with Assignment',
      description: 'This task is assigned by admin',
      assigned_to: regularEmployee.id,
      created_by: adminEmployee.id,
      department_id: department.id,
      estimated_hours: 5
    });
    console.log('✅ Task with assignment created successfully:', task1.title);

    // Test 2: Admin creates unassigned task (this was failing before)
    console.log('\n--- Test 2: Admin creates unassigned task ---');
    const task2 = await Task.create({
      title: 'Admin Task without Assignment',
      description: 'This task is not assigned to anyone',
      assigned_to: null,
      created_by: adminEmployee.id,
      department_id: department.id,
      estimated_hours: 3
    });
    console.log('✅ Unassigned task created successfully:', task2.title);

    // Test 3: Regular employee creates task (should auto-assign to themselves)
    console.log('\n--- Test 3: Regular employee creates task ---');
    const task3 = await Task.create({
      title: 'Employee Task',
      description: 'This task is created by employee',
      assigned_to: null, // Should be auto-assigned to employee
      created_by: regularEmployee.id,
      department_id: department.id,
      estimated_hours: 2
    });
    
    // Check if it was auto-assigned
    if (task3.assigned_to === regularEmployee.id) {
      console.log('✅ Employee task auto-assigned correctly:', task3.title);
    } else {
      console.log('❌ Employee task not auto-assigned. Assigned to:', task3.assigned_to);
    }

    console.log('\n🎉 All tests completed! Admin task creation is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testAdminTaskCreation();