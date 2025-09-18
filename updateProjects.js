const { sequelize, Project, Employee } = require('./models');

async function updateProjects() {
  try {
    // Get the first admin user to set as creator for existing projects
    const adminUser = await Employee.findOne({
      where: {
        role: 'admin'
      }
    });

    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      return;
    }

    // Update all existing projects to have the admin user as creator
    const [updatedRowsCount] = await Project.update(
      { created_by: adminUser.id },
      { where: { created_by: null } }
    );

    console.log(`Updated ${updatedRowsCount} projects with creator ID: ${adminUser.id}`);

    // Now make the created_by field non-nullable
    await sequelize.query('ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL');

    console.log('Successfully updated projects and made created_by field non-nullable');
  } catch (error) {
    console.error('Error updating projects:', error);
  } finally {
    await sequelize.close();
  }
}

updateProjects();