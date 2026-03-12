'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_seat_assignments', {
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
      seat_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('trip_seat_assignments', ['trip_id']);
    await queryInterface.addIndex('trip_seat_assignments', ['trip_id', 'client_id'], {
      unique: true,
      name: 'trip_seat_assignments_trip_client_unique',
    });
    await queryInterface.addIndex('trip_seat_assignments', ['trip_id', 'seat_number'], {
      unique: true,
      name: 'trip_seat_assignments_trip_seat_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trip_seat_assignments');
  },
};
