'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'clients',
      'total_amount_due',
      {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: null,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('clients', 'total_amount_due');
  },
};
