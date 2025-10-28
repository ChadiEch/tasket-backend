'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('projects', 'columns', {
      type: Sequelize.JSON,
      defaultValue: [],
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('projects', 'columns');
  }
};