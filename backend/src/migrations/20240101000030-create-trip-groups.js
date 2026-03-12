'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_groups', {
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
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'client_groups',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('trip_groups', ['trip_id']);
    await queryInterface.addIndex('trip_groups', ['group_id']);
    await queryInterface.addIndex('trip_groups', ['trip_id', 'group_id'], {
      unique: true,
      name: 'trip_groups_trip_group_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trip_groups');
  },
};
