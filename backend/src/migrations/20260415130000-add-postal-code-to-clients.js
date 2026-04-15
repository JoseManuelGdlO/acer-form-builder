'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'postal_code', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex('clients', ['company_id', 'postal_code'], {
      unique: false,
      name: 'clients_company_postal_code_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', 'clients_company_postal_code_idx');
    await queryInterface.removeColumn('clients', 'postal_code');
  },
};
