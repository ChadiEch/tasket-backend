const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('planned', 'in-progress', 'completed', 'cancelled'),
    defaultValue: 'planned'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  actual_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? (Array.isArray(rawValue) ? rawValue : JSON.parse(rawValue)) : [];
    },
    set(value) {
      this.setDataValue('tags', Array.isArray(value) ? value : []);
    }
  },
  // Add attachments field for documents, links, and photos
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('attachments');
      return rawValue ? (Array.isArray(rawValue) ? rawValue : JSON.parse(rawValue)) : [];
    },
    set(value) {
      this.setDataValue('attachments', Array.isArray(value) ? value : []);
    }
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
  tableName: 'tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Task;