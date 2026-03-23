'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('visa_status_templates', 'color', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visa_status_templates', 'color');
  },
};
