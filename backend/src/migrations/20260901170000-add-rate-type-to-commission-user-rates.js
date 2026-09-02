'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('commission_user_rates', 'rate_type', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'percentage',
    });
    await queryInterface.addColumn('commission_user_rates', 'fixed_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('commission_user_rates', 'fixed_amount');
    await queryInterface.removeColumn('commission_user_rates', 'rate_type');
  },
};
