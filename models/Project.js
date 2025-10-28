const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
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
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false, // Make it non-nullable now
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  // Add columns field to store project-specific columns
  columns: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('columns');
      if (!rawValue) return [];
      
      // Handle different possible formats
      if (Array.isArray(rawValue)) return rawValue;
      
      try {
        // Try to parse if it's a JSON string
        return JSON.parse(rawValue);
      } catch (e) {
        // If parsing fails, return empty array
        console.error('Error parsing columns JSON:', e);
        return [];
      }
    },
    set(value) {
      // Ensure we always store as an array
      const arrayValue = Array.isArray(value) ? value : [];
      this.setDataValue('columns', arrayValue);
    },
    validate: {
      // Custom validator to ensure columns are properly formatted
      isValidColumns(value) {
        if (!Array.isArray(value)) {
          throw new Error('Columns must be an array');
        }
        
        // Validate each column
        for (const column of value) {
          if (!column || typeof column !== 'object') {
            throw new Error('Each column must be an object');
          }
          
          if (!column.id) {
            throw new Error('Each column must have an id');
          }
          
          if (!column.title) {
            throw new Error('Each column must have a title');
          }
        }
      }
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
  tableName: 'projects',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Project;