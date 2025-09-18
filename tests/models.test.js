const { sequelize, Employee, Department, Task, TaskComment } = require('../models');
const bcrypt = require('bcryptjs');

describe('Models', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Department Model', () => {
    it('should create a department with valid data', async () => {
      const departmentData = {
        name: 'Engineering',
        description: 'Software Development Team',
        budget: 100000
      };

      const department = await Department.create(departmentData);
      
      expect(department.id).toBeDefined();
      expect(department.name).toBe(departmentData.name);
      expect(department.description).toBe(departmentData.description);
      expect(department.budget).toBe(departmentData.budget);
      expect(department.created_at).toBeDefined();
      expect(department.updated_at).toBeDefined();
    });

    it('should require name field', async () => {
      const departmentData = {
        description: 'Software Development Team',
        budget: 100000
      };

      await expect(Department.create(departmentData))
        .rejects
        .toThrow();
    });

    it('should enforce unique name constraint', async () => {
      const departmentData = {
        name: 'Engineering',
        description: 'Software Development Team'
      };

      await Department.create(departmentData);
      
      await expect(Department.create(departmentData))
        .rejects
        .toThrow();
    });

    it('should set default budget to 0', async () => {
      const department = await Department.create({
        name: 'Marketing',
        description: 'Marketing Team'
      });

      expect(department.budget).toBe(0);
    });
  });

  describe('Employee Model', () => {
    let testDepartment;

    beforeEach(async () => {
      testDepartment = await Department.create({
        name: 'Engineering',
        description: 'Software Development Team'
      });
    });

    it('should create an employee with valid data', async () => {
      const employeeData = {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        position: 'Developer',
        role: 'employee',
        department_id: testDepartment.id,
        phone: '1234567890'
      };

      const employee = await Employee.create(employeeData);
      
      expect(employee.id).toBeDefined();
      expect(employee.email).toBe(employeeData.email);
      expect(employee.name).toBe(employeeData.name);
      expect(employee.position).toBe(employeeData.position);
      expect(employee.role).toBe(employeeData.role);
      expect(employee.department_id).toBe(testDepartment.id);
    });

    it('should require email field', async () => {
      const employeeData = {
        password: 'hashed_password',
        name: 'Test User'
      };

      await expect(Employee.create(employeeData))
        .rejects
        .toThrow();
    });

    it('should require password field', async () => {
      const employeeData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await expect(Employee.create(employeeData))
        .rejects
        .toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const employeeData = {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User'
      };

      await Employee.create(employeeData);
      
      await expect(Employee.create({
        ...employeeData,
        name: 'Another User'
      })).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const employeeData = {
        email: 'invalid-email',
        password: 'hashed_password',
        name: 'Test User'
      };

      await expect(Employee.create(employeeData))
        .rejects
        .toThrow();
    });

    it('should set default role to employee', async () => {
      const employee = await Employee.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User'
      });

      expect(employee.role).toBe('employee');
    });

    it('should belong to department', async () => {
      const employee = await Employee.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        department_id: testDepartment.id
      });

      const employeeWithDept = await Employee.findByPk(employee.id, {
        include: ['department']
      });

      expect(employeeWithDept.department).toBeTruthy();
      expect(employeeWithDept.department.name).toBe('Engineering');
    });
  });

  describe('Task Model', () => {
    let testDepartment;
    let testEmployee;

    beforeEach(async () => {
      testDepartment = await Department.create({
        name: 'Engineering',
        description: 'Software Development Team'
      });

      testEmployee = await Employee.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        department_id: testDepartment.id
      });
    });

    it('should create a task with valid data', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        status: 'planned',
        priority: 'medium',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id,
        due_date: '2024-12-31'
      };

      const task = await Task.create(taskData);
      
      expect(task.id).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.assigned_to).toBe(testEmployee.id);
    });

    it('should require title field', async () => {
      const taskData = {
        description: 'Test task description',
        assigned_to: testEmployee.id,
        estimated_hours: 2
      };

      await expect(Task.create(taskData))
        .rejects
        .toThrow();
    });

    it('should set default status to planned', async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        estimated_hours: 2
      });

      expect(task.status).toBe('planned');
    });

    it('should set default priority to medium', async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        estimated_hours: 2
      });

      expect(task.priority).toBe('medium');
    });

    it('should validate status enum values', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        status: 'invalid_status',
        assigned_to: testEmployee.id,
        estimated_hours: 2
      };

      await expect(Task.create(taskData))
        .rejects
        .toThrow();
    });

    it('should validate priority enum values', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'invalid_priority',
        assigned_to: testEmployee.id,
        estimated_hours: 2
      };

      await expect(Task.create(taskData))
        .rejects
        .toThrow();
    });

    it('should belong to employee (assigned_to)', async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        estimated_hours: 2
      });

      const taskWithEmployee = await Task.findByPk(task.id, {
        include: ['assignedToEmployee']
      });

      expect(taskWithEmployee.assignedToEmployee).toBeTruthy();
      expect(taskWithEmployee.assignedToEmployee.name).toBe('Test User');
    });

    it('should belong to department', async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id,
        estimated_hours: 2
      });

      const taskWithDept = await Task.findByPk(task.id, {
        include: ['department']
      });

      expect(taskWithDept.department).toBeTruthy();
      expect(taskWithDept.department.name).toBe('Engineering');
    });
  });

  describe('TaskComment Model', () => {
    let testEmployee;
    let testTask;

    beforeEach(async () => {
      const testDepartment = await Department.create({
        name: 'Engineering',
        description: 'Software Development Team'
      });

      testEmployee = await Employee.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        department_id: testDepartment.id
      });

      testTask = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        estimated_hours: 2
      });
    });

    it('should create a task comment with valid data', async () => {
      const commentData = {
        comment: 'This is a test comment',
        task_id: testTask.id,
        employee_id: testEmployee.id
      };

      const taskComment = await TaskComment.create(commentData);
      
      expect(taskComment.id).toBeDefined();
      expect(taskComment.comment).toBe(commentData.comment);
      expect(taskComment.task_id).toBe(testTask.id);
      expect(taskComment.employee_id).toBe(testEmployee.id);
      expect(taskComment.created_at).toBeDefined();
    });

    it('should require comment field', async () => {
      const commentData = {
        task_id: testTask.id,
        employee_id: testEmployee.id
      };

      await expect(TaskComment.create(commentData))
        .rejects
        .toThrow();
    });

    it('should require task_id field', async () => {
      const commentData = {
        comment: 'This is a test comment',
        employee_id: testEmployee.id
      };

      await expect(TaskComment.create(commentData))
        .rejects
        .toThrow();
    });

    it('should require employee_id field', async () => {
      const commentData = {
        comment: 'This is a test comment',
        task_id: testTask.id
      };

      await expect(TaskComment.create(commentData))
        .rejects
        .toThrow();
    });

    it('should belong to task', async () => {
      const taskComment = await TaskComment.create({
        comment: 'Test comment',
        task_id: testTask.id,
        employee_id: testEmployee.id
      });

      const commentWithTask = await TaskComment.findByPk(taskComment.id, {
        include: ['task']
      });

      expect(commentWithTask.task).toBeTruthy();
      expect(commentWithTask.task.title).toBe('Test Task');
    });

    it('should belong to employee', async () => {
      const taskComment = await TaskComment.create({
        comment: 'Test comment',
        task_id: testTask.id,
        employee_id: testEmployee.id
      });

      const commentWithEmployee = await TaskComment.findByPk(taskComment.id, {
        include: ['employee']
      });

      expect(commentWithEmployee.employee).toBeTruthy();
      expect(commentWithEmployee.employee.name).toBe('Test User');
    });
  });

  describe('Model Relationships', () => {
    let testDepartment;
    let testEmployee;
    let testTask;

    beforeEach(async () => {
      testDepartment = await Department.create({
        name: 'Engineering',
        description: 'Software Development Team'
      });

      testEmployee = await Employee.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        department_id: testDepartment.id
      });

      testTask = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        assigned_to: testEmployee.id,
        created_by: testEmployee.id,
        department_id: testDepartment.id,
        estimated_hours: 2
      });
    });

    it('should load department employees', async () => {
      const department = await Department.findByPk(testDepartment.id, {
        include: ['employees']
      });

      expect(department.employees).toHaveLength(1);
      expect(department.employees[0].name).toBe('Test User');
    });

    it('should load employee assigned tasks', async () => {
      const employee = await Employee.findByPk(testEmployee.id, {
        include: ['assignedTasks']
      });

      expect(employee.assignedTasks).toHaveLength(1);
      expect(employee.assignedTasks[0].title).toBe('Test Task');
    });

    it('should load department tasks', async () => {
      const department = await Department.findByPk(testDepartment.id, {
        include: ['tasks']
      });

      expect(department.tasks).toHaveLength(1);
      expect(department.tasks[0].title).toBe('Test Task');
    });

    it('should load task comments', async () => {
      await TaskComment.create({
        comment: 'Test comment',
        task_id: testTask.id,
        employee_id: testEmployee.id
      });

      const task = await Task.findByPk(testTask.id, {
        include: ['comments']
      });

      expect(task.comments).toHaveLength(1);
      expect(task.comments[0].comment).toBe('Test comment');
    });
  });
});