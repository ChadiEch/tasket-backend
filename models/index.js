const sequelize = require('../config/database');
const Department = require('./Department');
const Employee = require('./Employee');
const Task = require('./Task');
const TaskComment = require('./TaskComment');
const Project = require('./Project');
const Notification = require('./Notification');
const MeistertaskProject = require('./MeistertaskProject');

// Define associations
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Manager relationship
Department.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Employee.hasOne(Department, { foreignKey: 'manager_id', as: 'managedDepartment' });

Employee.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
Employee.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
Task.belongsTo(Employee, { foreignKey: 'assigned_to', as: 'assignedToEmployee' });
Task.belongsTo(Employee, { foreignKey: 'created_by', as: 'createdByEmployee' });

Department.hasMany(Task, { foreignKey: 'department_id', as: 'tasks' });
Task.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Task.hasMany(TaskComment, { foreignKey: 'task_id', as: 'comments' });
TaskComment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

Employee.hasMany(TaskComment, { foreignKey: 'employee_id', as: 'comments' });
TaskComment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Project associations
Employee.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
Project.belongsTo(Employee, { foreignKey: 'created_by', as: 'creator' });

// Meistertask Project associations
Employee.hasMany(MeistertaskProject, { foreignKey: 'created_by', as: 'createdMeistertaskProjects' });
MeistertaskProject.belongsTo(Employee, { foreignKey: 'created_by', as: 'creator' });

// Notification associations
Employee.hasMany(Notification, { foreignKey: 'recipient_id', as: 'notifications' });
Notification.belongsTo(Employee, { foreignKey: 'recipient_id', as: 'recipient' });
Notification.belongsTo(Employee, { foreignKey: 'sender_id', as: 'sender' });
Notification.belongsTo(Task, { foreignKey: 'related_task_id', as: 'relatedTask' });
Notification.belongsTo(Project, { foreignKey: 'related_project_id', as: 'relatedProject' });

module.exports = {
  sequelize,
  Department,
  Employee,
  Task,
  TaskComment,
  Project,
  MeistertaskProject,
  Notification
};