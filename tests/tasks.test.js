const request = require('supertest');
const app = require('../server');
const { sequelize, Employee, Department, Task } = require('../models');
const bcrypt = require('bcryptjs');

describe('Task Routes', () => {
  let testEmployee;
  let testDepartment;
  let authToken;
  let adminEmployee;
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create test department
    testDepartment = await testUtils.createTestDepartment({
      name: 'Engineering',
      description: 'Software Development'
    });

    // Create test employee
    testEmployee = await testUtils.createTestUser({
      email: 'employee@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Test Employee',
      role: 'employee',
      department_id: testDepartment.id
    });

    // Create admin employee
    adminEmployee = await testUtils.createTestUser({
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Admin User',
      role: 'admin',
      department_id: testDepartment.id
    });

    // Get auth tokens
    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employee@example.com',
        password: 'password123'
      });
    authToken = employeeLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await testUtils.createTestTask({
        title: 'Task 1',
        description: 'First task',
        status: 'planned',
        priority: 'high',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id
      });

      await testUtils.createTestTask({
        title: 'Task 2',
        description: 'Second task',
        status: 'in-progress',
        priority: 'medium',
        assigned_to: testEmployee.id,
        created_by: adminEmployee.id,
        department_id: testDepartment.id
      });
    });

    it('should get all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=planned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('planned');
    });

    it('should filter tasks by assigned employee', async () => {
      const response = await request(app)
        .get(`/api/tasks?assigned_to=${testEmployee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tasks.length).toBeGreaterThan(0);
      response.body.tasks.forEach(task => {
        expect(task.assigned_to).toBe(testEmployee.id);
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await testUtils.createTestTask({
        title: 'Test Task',
        description: 'Test task description',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id
      });
    });

    it('should get specific task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task.id).toBe(testTask.id);
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New task description',
        status: 'planned',
        priority: 'medium',
        assigned_to: testEmployee.id,
        department_id: testDepartment.id,
        due_date: '2024-12-31'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.description).toBe(taskData.description);
      expect(response.body.task.created_by).toBe(testEmployee.id);

      // Verify task was created in database
      const task = await Task.findByPk(response.body.task.id);
      expect(task).toBeTruthy();
      expect(task.title).toBe(taskData.title);
    });

    it('should fail without authentication', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New task description'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should set default values for optional fields', async () => {
      const taskData = {
        title: 'Minimal Task',
        description: 'Minimal task description'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.task.status).toBe('planned');
      expect(response.body.task.priority).toBe('medium');
      expect(response.body.task.created_by).toBe(testEmployee.id);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await testUtils.createTestTask({
        title: 'Original Task',
        description: 'Original description',
        status: 'planned',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id
      });
    });

    it('should update task with valid data', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'in-progress',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.description).toBe(updateData.description);
      expect(response.body.task.status).toBe(updateData.status);

      // Verify update in database
      const updatedTask = await Task.findByPk(testTask.id);
      expect(updatedTask.title).toBe(updateData.title);
      expect(updatedTask.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow partial updates', async () => {
      const updateData = {
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.task.status).toBe('completed');
      expect(response.body.task.title).toBe('Original Task'); // Should remain unchanged
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await testUtils.createTestTask({
        title: 'Task to Delete',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id
      });
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');

      // Verify task was deleted from database
      const deletedTask = await Task.findByPk(testTask.id);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Task Authorization', () => {
    let employeeTask;
    let otherEmployee;
    let otherToken;

    beforeEach(async () => {
      // Create another employee
      otherEmployee = await testUtils.createTestUser({
        email: 'other@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Other Employee',
        role: 'employee',
        department_id: testDepartment.id
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'password123'
        });
      otherToken = otherLogin.body.token;

      // Create task assigned to first employee
      employeeTask = await testUtils.createTestTask({
        title: 'Employee Task',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id
      });
    });

    it('should allow admin to access any task', async () => {
      const response = await request(app)
        .get(`/api/tasks/${employeeTask.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.task.id).toBe(employeeTask.id);
    });

    it('should allow employee to access assigned tasks', async () => {
      const response = await request(app)
        .get(`/api/tasks/${employeeTask.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.task.id).toBe(employeeTask.id);
    });
  });
});