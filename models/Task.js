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
    type: DataTypes.ENUM('planned', 'in-progress', 'completed', 'cancelled', 'trashed'),
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
      if (!rawValue) return [];
      
      // Handle different possible formats
      if (Array.isArray(rawValue)) return rawValue;
      
      try {
        // Try to parse if it's a JSON string
        return JSON.parse(rawValue);
      } catch (e) {
        // If parsing fails, return empty array
        console.error('Error parsing attachments JSON:', e);
        return [];
      }
    },
    set(value) {
      // Ensure we always store as an array
      const arrayValue = Array.isArray(value) ? value : [];
      this.setDataValue('attachments', arrayValue);
    },
    validate: {
      // Custom validator to ensure attachments are properly formatted
      isValidAttachments(value) {
        if (!Array.isArray(value)) {
          throw new Error('Attachments must be an array');
        }
        
        // Validate each attachment
        for (const attachment of value) {
          if (!attachment || typeof attachment !== 'object') {
            throw new Error('Each attachment must be an object');
          }
          
          if (!attachment.id) {
            throw new Error('Each attachment must have an id');
          }
          
          if (!attachment.type) {
            throw new Error('Each attachment must have a type');
          }
          
          if (!attachment.url && !attachment.name) {
            throw new Error('Each attachment must have a url or name');
          }
        }
      }
    }
  },
  // Add trashed_at field to track when task was moved to trash
  trashed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Add restored_at field to track when task was restored from trash
  restored_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Add status_before_trash to track the previous status when moving to trash
  status_before_trash: {
    type: DataTypes.STRING,
    allowNull: true
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

// Add a custom method to update the created_at field
Task.prototype.updateCreatedAt = async function(newDate) {
  try {
    // Use a raw query to bypass Sequelize's automatic timestamp management
    const sequelize = require('../config/database');
    await sequelize.query(
      'UPDATE tasks SET created_at = ? WHERE id = ?',
      {
        replacements: [newDate, this.id],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Update the instance in memory
    this.created_at = newDate;
    
    console.log('Successfully updated created_at to:', newDate);
    return this;
  } catch (error) {
    console.error('Error updating created_at:', error);
    throw error;
  }
};

module.exports = Task;