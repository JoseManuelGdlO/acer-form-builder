'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('companies', 'domain', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('companies', 'theme', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('companies', 'domain');
    await queryInterface.removeColumn('companies', 'theme');
  },
};
