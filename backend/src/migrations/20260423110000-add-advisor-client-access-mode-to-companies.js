'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('companies');
    if (!table.advisor_client_access_mode) {
      await queryInterface.addColumn('companies', 'advisor_client_access_mode', {
        type: Sequelize.ENUM('assigned_only', 'company_wide'),
        allowNull: false,
        defaultValue: 'assigned_only',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('companies');
    if (table.advisor_client_access_mode) {
      await queryInterface.removeColumn('companies', 'advisor_client_access_mode');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_companies_advisor_client_access_mode";').catch(() => {});
  },
};
