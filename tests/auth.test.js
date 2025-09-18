const request = require('supertest');
const app = require('../server');
const { sequelize, Employee, Department } = require('../models');
const bcrypt = require('bcryptjs');

describe('Auth Routes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new employee successfully', async () => {
      const department = await testUtils.createTestDepartment({
        name: 'Engineering',
        description: 'Software Development'
      });

      const employeeData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        position: 'Developer',
        department_id: department.id,
        phone: '1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(employeeData)
        .expect(201);

      expect(response.body).toHaveProperty('employee');
      expect(response.body).toHaveProperty('token');
      expect(response.body.employee.email).toBe(employeeData.email);
      expect(response.body.employee.name).toBe(employeeData.name);
      expect(response.body.employee).not.toHaveProperty('password');

      // Verify employee was created in database
      const employee = await Employee.findOne({ where: { email: employeeData.email } });
      expect(employee).toBeTruthy();
      expect(employee.name).toBe(employeeData.name);
    });

    it('should fail with duplicate email', async () => {
      const existingEmployee = await testUtils.createTestUser({
        email: 'existing@example.com'
      });

      const employeeData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Duplicate User',
        position: 'Developer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(employeeData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Duplicate entry');
    });

    it('should fail with invalid email format', async () => {
      const employeeData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        position: 'Developer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(employeeData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should hash password before storing', async () => {
      const employeeData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        position: 'Developer'
      };

      await request(app)
        .post('/api/auth/register')
        .send(employeeData)
        .expect(201);

      const employee = await Employee.findOne({ where: { email: employeeData.email } });
      expect(employee.password).not.toBe(employeeData.password);
      
      // Verify password can be verified
      const isValid = await bcrypt.compare(employeeData.password, employee.password);
      expect(isValid).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmployee;

    beforeEach(async () => {
      testEmployee = await testUtils.createTestUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User'
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('employee');
      expect(response.body).toHaveProperty('token');
      expect(response.body.employee.email).toBe(loginData.email);
      expect(response.body.employee).not.toHaveProperty('password');
    });

    it('should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/profile', () => {
    let testEmployee;
    let authToken;

    beforeEach(async () => {
      testEmployee = await testUtils.createTestUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('employee');
      expect(response.body.employee.email).toBe('test@example.com');
      expect(response.body.employee.name).toBe('Test User');
      expect(response.body.employee).not.toHaveProperty('password');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testEmployee;
    let authToken;

    beforeEach(async () => {
      testEmployee = await testUtils.createTestUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User',
        position: 'Developer'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should update user profile with valid data', async () => {
      const updateData = {
        name: 'Updated User',
        position: 'Senior Developer',
        phone: '9876543210'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('employee');
      expect(response.body.employee.name).toBe(updateData.name);
      expect(response.body.employee.position).toBe(updateData.position);
      expect(response.body.employee.phone).toBe(updateData.phone);

      // Verify update in database
      const updatedEmployee = await Employee.findByPk(testEmployee.id);
      expect(updatedEmployee.name).toBe(updateData.name);
      expect(updatedEmployee.position).toBe(updateData.position);
    });

    it('should fail without authorization', async () => {
      const updateData = {
        name: 'Updated User'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should not allow updating email', async () => {
      const updateData = {
        email: 'newemail@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Email should remain unchanged
      const employee = await Employee.findByPk(testEmployee.id);
      expect(employee.email).toBe('test@example.com');
    });
  });
});