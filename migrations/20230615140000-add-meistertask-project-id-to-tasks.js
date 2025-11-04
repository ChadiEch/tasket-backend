'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tasks', 'meistertask_project_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'meistertask_projects',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tasks', 'meistertask_project_id');
  }
};