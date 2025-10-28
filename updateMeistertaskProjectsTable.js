const { sequelize, MeistertaskProject } = require('./models');

async function updateMeistertaskProjectsTable() {
  try {
    // Sync the MeistertaskProject model to create the table
    await MeistertaskProject.sync({ alter: true });
    
    console.log('Successfully created meistertask_projects table');
  } catch (error) {
    console.error('Error updating meistertask_projects table:', error);
  } finally {
    await sequelize.close();
  }
}

updateMeistertaskProjectsTable();