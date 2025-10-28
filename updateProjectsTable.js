const { sequelize } = require('./models');

async function updateProjectsTable() {
  try {
    // Add the columns column to the projects table
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS columns JSON DEFAULT '[]'
    `);
    
    console.log('Successfully added columns column to projects table');
  } catch (error) {
    console.error('Error updating projects table:', error);
  } finally {
    await sequelize.close();
  }
}

updateProjectsTable();