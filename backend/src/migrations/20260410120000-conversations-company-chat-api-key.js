'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('conversations', 'company_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('conversations', ['company_id', 'phone'], {
      name: 'conversations_company_id_phone_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('conversations', 'conversations_company_id_phone_idx');
    await queryInterface.removeColumn('conversations', 'company_id');
  },
};
