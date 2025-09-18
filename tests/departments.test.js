const request = require('supertest');
const app = require('../server');
const { sequelize, Employee, Department } = require('../models');
const bcrypt = require('bcryptjs');

describe('Department Routes', () => {
  let adminEmployee;
  let regularEmployee;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create admin employee
    adminEmployee = await testUtils.createTestUser({
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Admin User',
      role: 'admin'
    });

    // Create regular employee
    regularEmployee = await testUtils.createTestUser({
      email: 'user@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Regular User',
      role: 'employee'
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/departments', () => {
    beforeEach(async () => {
      await testUtils.createTestDepartment({
        name: 'Engineering',
        description: 'Software Development',
        budget: 100000
      });

      await testUtils.createTestDepartment({
        name: 'Marketing',
        description: 'Marketing and Sales',
        budget: 80000
      });
    });

    it('should get all departments for authenticated user', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('departments');
      expect(Array.isArray(response.body.departments)).toBe(true);
      expect(response.body.departments.length).toBe(2);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/departments')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should include department details', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const department = response.body.departments[0];
      expect(department).toHaveProperty('name');
      expect(department).toHaveProperty('description');
      expect(department).toHaveProperty('budget');
    });
  });

  describe('GET /api/departments/:id', () => {
    let testDepartment;

    beforeEach(async () => {
      testDepartment = await testUtils.createTestDepartment({
        name: 'Test Department',
        description: 'Test Description',
        budget: 50000
      });
    });

    it('should get specific department by ID', async () => {
      const response = await request(app)
        .get(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('department');
      expect(response.body.department.id).toBe(testDepartment.id);
      expect(response.body.department.name).toBe('Test Department');
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/api/departments/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/departments', () => {
    it('should create new department as admin', async () => {
      const departmentData = {
        name: 'New Department',
        description: 'New department description',
        budget: 75000,
        manager_id: adminEmployee.id
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData)
        .expect(201);

      expect(response.body).toHaveProperty('department');
      expect(response.body.department.name).toBe(departmentData.name);
      expect(response.body.department.description).toBe(departmentData.description);
      expect(response.body.department.budget).toBe(departmentData.budget);

      // Verify department was created in database
      const department = await Department.findByPk(response.body.department.id);
      expect(department).toBeTruthy();
      expect(department.name).toBe(departmentData.name);
    });

    it('should fail for non-admin user', async () => {
      const departmentData = {
        name: 'New Department',
        description: 'New department description',
        budget: 75000
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(departmentData)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Admin access required');
    });

    it('should fail without authentication', async () => {
      const departmentData = {
        name: 'New Department',
        description: 'New department description'
      };

      const response = await request(app)
        .post('/api/departments')
        .send(departmentData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with duplicate department name', async () => {
      await testUtils.createTestDepartment({
        name: 'Existing Department'
      });

      const departmentData = {
        name: 'Existing Department',
        description: 'Duplicate name'
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/departments/:id', () => {
    let testDepartment;

    beforeEach(async () => {
      testDepartment = await testUtils.createTestDepartment({
        name: 'Original Department',
        description: 'Original description',
        budget: 50000
      });
    });

    it('should update department as admin', async () => {
      const updateData = {
        name: 'Updated Department',
        description: 'Updated description',
        budget: 75000
      };

      const response = await request(app)
        .put(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('department');
      expect(response.body.department.name).toBe(updateData.name);
      expect(response.body.department.description).toBe(updateData.description);
      expect(response.body.department.budget).toBe(updateData.budget);

      // Verify update in database
      const updatedDepartment = await Department.findByPk(testDepartment.id);
      expect(updatedDepartment.name).toBe(updateData.name);
    });

    it('should fail for non-admin user', async () => {
      const updateData = {
        name: 'Updated Department'
      };

      const response = await request(app)
        .put(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .put('/api/departments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow partial updates', async () => {
      const updateData = {
        budget: 60000
      };

      const response = await request(app)
        .put(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.department.budget).toBe(60000);
      expect(response.body.department.name).toBe('Original Department'); // Should remain unchanged
    });
  });

  describe('DELETE /api/departments/:id', () => {
    let testDepartment;

    beforeEach(async () => {
      testDepartment = await testUtils.createTestDepartment({
        name: 'Department to Delete',
        description: 'This department will be deleted'
      });
    });

    it('should delete department as admin', async () => {
      const response = await request(app)
        .delete(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');

      // Verify department was deleted from database
      const deletedDepartment = await Department.findByPk(testDepartment.id);
      expect(deletedDepartment).toBeNull();
    });

    it('should fail for non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');

      // Verify department was not deleted
      const department = await Department.findByPk(testDepartment.id);
      expect(department).toBeTruthy();
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .delete('/api/departments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should prevent deletion if department has employees', async () => {
      // Add employee to department
      await Employee.update(
        { department_id: testDepartment.id },
        { where: { id: regularEmployee.id } }
      );

      const response = await request(app)
        .delete(`/api/departments/${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('employees');

      // Verify department was not deleted
      const department = await Department.findByPk(testDepartment.id);
      expect(department).toBeTruthy();
    });
  });
});