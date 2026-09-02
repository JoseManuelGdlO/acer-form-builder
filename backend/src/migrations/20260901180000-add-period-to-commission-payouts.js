'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('commission_payouts');

    if (!table.period_type) {
      await queryInterface.addColumn('commission_payouts', 'period_type', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }
    if (!table.period_from) {
      await queryInterface.addColumn('commission_payouts', 'period_from', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
    if (!table.period_to) {
      await queryInterface.addColumn('commission_payouts', 'period_to', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex('commission_payouts');
    const hasUniqueIndex = indexes.some((idx) => idx.name === 'commission_payouts_user_period_unique');
    if (!hasUniqueIndex) {
      await queryInterface.addIndex(
        'commission_payouts',
        ['company_id', 'assigned_user_id', 'period_type', 'period_from', 'period_to'],
        {
          unique: true,
          name: 'commission_payouts_user_period_unique',
        }
      );
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('commission_payouts');
    const hasUniqueIndex = indexes.some((idx) => idx.name === 'commission_payouts_user_period_unique');
    if (hasUniqueIndex) {
      await queryInterface.removeIndex('commission_payouts', 'commission_payouts_user_period_unique');
    }

    const table = await queryInterface.describeTable('commission_payouts');
    if (table.period_to) await queryInterface.removeColumn('commission_payouts', 'period_to');
    if (table.period_from) await queryInterface.removeColumn('commission_payouts', 'period_from');
    if (table.period_type) await queryInterface.removeColumn('commission_payouts', 'period_type');
  },
};
