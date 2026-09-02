'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('commission_user_rates', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      rate_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10,
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

    await queryInterface.addIndex('commission_user_rates', ['company_id', 'user_id'], {
      unique: true,
      name: 'commission_user_rates_company_user_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('commission_user_rates');
  },
};
