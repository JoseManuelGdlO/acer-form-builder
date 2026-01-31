'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('form_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      progress: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed'),
        defaultValue: 'in_progress',
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('form_sessions', ['form_id']);
    await queryInterface.addIndex('form_sessions', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('form_sessions');
  },
};
