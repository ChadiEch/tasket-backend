const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recipient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  related_task_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  related_project_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Notification;