'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'parent_client_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('clients', ['parent_client_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', ['parent_client_id']);
    await queryInterface.removeColumn('clients', 'parent_client_id');
  },
};
