'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'client_payments',
      'payment_type',
      {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'efectivo',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('client_payments', 'payment_type');
  },
};
