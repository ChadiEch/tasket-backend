const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskComment = sequelize.define('TaskComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  comment_type: {
    type: DataTypes.ENUM('comment', 'status_change', 'assignment_change'),
    defaultValue: 'comment'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'task_comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TaskComment;