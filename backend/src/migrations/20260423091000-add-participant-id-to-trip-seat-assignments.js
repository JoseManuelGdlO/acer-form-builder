'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trip_seat_assignments');
    if (!table.participant_id) {
      await queryInterface.addColumn('trip_seat_assignments', 'participant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'trip_participants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE trip_seat_assignments tsa
      INNER JOIN trip_participants tp
        ON tp.trip_id = tsa.trip_id
       AND tp.client_id = tsa.client_id
      SET tsa.participant_id = tp.id
      WHERE tsa.participant_id IS NULL
    `);

    const indexes = await queryInterface.showIndex('trip_seat_assignments');
    const hasIndex = indexes.some((idx) => idx.name === 'trip_seat_assignments_trip_participant_unique');
    if (!hasIndex) {
      await queryInterface.addIndex('trip_seat_assignments', ['trip_id', 'participant_id'], {
        unique: true,
        name: 'trip_seat_assignments_trip_participant_unique',
        where: {
          participant_id: {
            [Sequelize.Op.ne]: null,
          },
        },
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const indexes = await queryInterface.showIndex('trip_seat_assignments');
    const hasIndex = indexes.some((idx) => idx.name === 'trip_seat_assignments_trip_participant_unique');
    if (hasIndex) {
      await queryInterface.removeIndex('trip_seat_assignments', 'trip_seat_assignments_trip_participant_unique');
    }
    const table = await queryInterface.describeTable('trip_seat_assignments');
    if (table.participant_id) {
      await queryInterface.removeColumn('trip_seat_assignments', 'participant_id');
    }
  },
};
