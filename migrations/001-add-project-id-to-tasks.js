// Migration to add project_id column to tasks table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add project_id column to tasks table
    await queryInterface.addColumn('tasks', 'project_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove project_id column from tasks table
    await queryInterface.removeColumn('tasks', 'project_id');
  }
};