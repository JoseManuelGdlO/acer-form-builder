'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_expenses', {
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
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trips',
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
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      reference_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
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

    await queryInterface.addIndex('trip_expenses', ['trip_id']);
    await queryInterface.addIndex('trip_expenses', ['company_id', 'expense_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trip_expenses');
  },
};
