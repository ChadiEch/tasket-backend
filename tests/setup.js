const { Sequelize } = require('sequelize');

// Setup test database
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';

// Use in-memory SQLite for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Mock database for tests
global.testDB = sequelize;

// Global test utilities
global.testUtils = {
  // Helper to create test user
  async createTestUser(userData = {}) {
    const { Employee } = require('../models');
    const bcrypt = require('bcryptjs');
    
    const defaultUser = {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Test User',
      position: 'Developer',
      role: 'employee',
      ...userData
    };
    
    return await Employee.create(defaultUser);
  },

  // Helper to create test department
  async createTestDepartment(deptData = {}) {
    const { Department } = require('../models');
    
    const defaultDept = {
      name: 'Test Department',
      description: 'Test Department Description',
      budget: 100000,
      ...deptData
    };
    
    return await Department.create(defaultDept);
  },

  // Helper to create test task
  async createTestTask(taskData = {}) {
    const { Task } = require('../models');
    
    const defaultTask = {
      title: 'Test Task',
      description: 'Test Task Description',
      status: 'planned',
      priority: 'medium',
      ...taskData
    };
    
    return await Task.create(defaultTask);
  }
};

// Setup and teardown hooks
beforeAll(async () => {
  // Initialize test database
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  // Clean up database before each test
  const models = require('../models');
  await models.sequelize.sync({ force: true });
});

afterEach(async () => {
  // Clean up after each test
  jest.clearAllMocks();
});