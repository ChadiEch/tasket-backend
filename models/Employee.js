const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Add job description field
  job_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    defaultValue: 'employee'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hire_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Add photo field for employee photos
  photo: {
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
  tableName: 'employees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (employee) => {
      if (employee.password) {
        const salt = await bcrypt.genSalt(10);
        employee.password = await bcrypt.hash(employee.password, salt);
      }
    },
    beforeUpdate: async (employee) => {
      if (employee.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        employee.password = await bcrypt.hash(employee.password, salt);
      }
    }
  }
});

// Instance method to check password
Employee.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = Employee;