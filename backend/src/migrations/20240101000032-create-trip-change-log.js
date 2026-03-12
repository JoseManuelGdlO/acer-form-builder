'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_change_log', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trips',
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
      action: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      field_name: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      old_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      new_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('trip_change_log', ['trip_id']);
    await queryInterface.addIndex('trip_change_log', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trip_change_log');
  },
};
