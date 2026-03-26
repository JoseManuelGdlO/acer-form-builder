'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'birth_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('clients', 'relationship_to_holder', {
      type: Sequelize.STRING(120),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clients', 'relationship_to_holder');
    await queryInterface.removeColumn('clients', 'birth_date');
  },
};
