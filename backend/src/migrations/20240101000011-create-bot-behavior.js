'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bot_behavior', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'Asistente Saru',
      },
      greeting: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      personality: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tone: {
        type: Sequelize.ENUM('formal', 'friendly', 'professional'),
        defaultValue: 'professional',
        allowNull: false,
      },
      fallback_message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      response_delay: {
        type: Sequelize.INTEGER,
        defaultValue: 500,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bot_behavior');
  },
};
