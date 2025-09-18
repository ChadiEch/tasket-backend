const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Add job_description column to employees table
async function addJobDescriptionColumn() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Add the job_description column to the employees table
    await sequelize.queryInterface.addColumn('employees', 'job_description', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    
    console.log('Successfully added job_description column to employees table');
  } catch (error) {
    console.error('Error adding job_description column:', error);
  } finally {
    await sequelize.close();
  }
}

addJobDescriptionColumn();