'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_recipients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      notification_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'notifications',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      recipient_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('notification_recipients', ['company_id']);
    await queryInterface.addIndex('notification_recipients', ['recipient_user_id']);
    await queryInterface.addIndex('notification_recipients', ['notification_id']);
    await queryInterface.addIndex('notification_recipients', ['read_at']);
    await queryInterface.addIndex('notification_recipients', ['company_id', 'recipient_user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_recipients');
  },
};

