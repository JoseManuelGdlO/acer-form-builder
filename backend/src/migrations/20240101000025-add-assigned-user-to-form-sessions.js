'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('form_sessions', 'assigned_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('form_sessions', ['assigned_user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('form_sessions', ['assigned_user_id']);
    await queryInterface.removeColumn('form_sessions', 'assigned_user_id');
  },
};
