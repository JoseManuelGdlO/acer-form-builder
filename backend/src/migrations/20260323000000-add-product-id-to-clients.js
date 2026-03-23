'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'product_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('clients', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', ['product_id']);
    await queryInterface.removeColumn('clients', 'product_id');
  },
};
