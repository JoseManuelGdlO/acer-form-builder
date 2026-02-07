'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('form_sessions', 'client_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addColumn('form_sessions', 'submission_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'form_submissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('form_sessions', ['client_id']);
    await queryInterface.addIndex('form_sessions', ['submission_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('form_sessions', ['submission_id']);
    await queryInterface.removeIndex('form_sessions', ['client_id']);
    await queryInterface.removeColumn('form_sessions', 'submission_id');
    await queryInterface.removeColumn('form_sessions', 'client_id');
  },
};
