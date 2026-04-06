'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('client_acquired_packages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      parent_client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      beneficiary_client_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'clients', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('client_acquired_packages', ['company_id']);
    await queryInterface.addIndex('client_acquired_packages', ['parent_client_id']);
    await queryInterface.addIndex('client_acquired_packages', ['product_id']);

    await queryInterface.addColumn('client_payments', 'acquired_package_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'client_acquired_packages', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('client_payments', ['acquired_package_id']);

    await queryInterface.addColumn('client_payment_deleted_log', 'acquired_package_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'client_acquired_packages', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('client_payment_deleted_log', ['acquired_package_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('client_payment_deleted_log', ['acquired_package_id']);
    await queryInterface.removeColumn('client_payment_deleted_log', 'acquired_package_id');

    await queryInterface.removeIndex('client_payments', ['acquired_package_id']);
    await queryInterface.removeColumn('client_payments', 'acquired_package_id');

    await queryInterface.dropTable('client_acquired_packages');
  },
};
