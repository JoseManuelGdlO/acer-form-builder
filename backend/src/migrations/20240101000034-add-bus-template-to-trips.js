'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trips', 'bus_template_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'bus_templates',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('trips', ['bus_template_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('trips', 'bus_template_id');
  },
};
