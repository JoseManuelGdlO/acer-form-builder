'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_participants', {
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
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
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

    await queryInterface.addIndex('trip_participants', ['trip_id']);
    await queryInterface.addIndex('trip_participants', ['client_id']);
    await queryInterface.addIndex('trip_participants', ['trip_id', 'client_id'], {
      unique: true,
      name: 'trip_participants_trip_client_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trip_participants');
  },
};
