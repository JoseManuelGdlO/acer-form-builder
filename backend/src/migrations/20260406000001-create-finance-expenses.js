'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('finance_expenses', {
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
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      concept: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
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
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('finance_expenses', ['company_id']);
    await queryInterface.addIndex('finance_expenses', ['company_id', 'expense_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('finance_expenses');
  },
};
