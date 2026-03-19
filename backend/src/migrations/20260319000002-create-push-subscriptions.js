'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('push_subscriptions', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      keys_auth: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      keys_p256dh: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      last_seen_at: {
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

    await queryInterface.addIndex('push_subscriptions', ['company_id']);
    await queryInterface.addIndex('push_subscriptions', ['user_id']);
    await queryInterface.addIndex('push_subscriptions', ['endpoint']);
    await queryInterface.addIndex('push_subscriptions', ['company_id', 'user_id', 'endpoint'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_subscriptions');
  },
};

