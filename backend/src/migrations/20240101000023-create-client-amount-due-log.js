'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('client_amount_due_log', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      previous_value: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      new_value: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('client_amount_due_log', ['client_id']);
    await queryInterface.addIndex('client_amount_due_log', ['company_id']);
    await queryInterface.addIndex('client_amount_due_log', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('client_amount_due_log');
  },
};
