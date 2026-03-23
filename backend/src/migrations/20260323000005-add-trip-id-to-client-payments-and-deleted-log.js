'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('client_payments', 'trip_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('client_payments', ['trip_id']);
    await queryInterface.addIndex('client_payments', ['trip_id', 'payment_date']);

    await queryInterface.addColumn('client_payment_deleted_log', 'trip_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('client_payment_deleted_log', ['trip_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('client_payment_deleted_log', ['trip_id']);
    await queryInterface.removeColumn('client_payment_deleted_log', 'trip_id');

    await queryInterface.removeIndex('client_payments', ['trip_id', 'payment_date']);
    await queryInterface.removeIndex('client_payments', ['trip_id']);
    await queryInterface.removeColumn('client_payments', 'trip_id');
  },
};
