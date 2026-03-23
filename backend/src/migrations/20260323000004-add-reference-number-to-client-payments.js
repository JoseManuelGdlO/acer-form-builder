'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('client_payments', 'reference_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('client_payment_deleted_log', 'reference_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('client_payment_deleted_log', 'reference_number');
    await queryInterface.removeColumn('client_payments', 'reference_number');
  },
};
