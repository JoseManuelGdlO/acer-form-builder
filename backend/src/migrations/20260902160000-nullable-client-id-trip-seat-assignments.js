'use strict';

/** Allow null client_id on seat assignments (companions/staff slots). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [fks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'trip_seat_assignments'
        AND COLUMN_NAME = 'client_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of fks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`trip_seat_assignments\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      );
    }

    // Unique (trip_id, client_id) blocks multiple seats for one client group if client_id is reused;
    // companions use null client_id, so keep the index but make the column nullable.
    await queryInterface.changeColumn('trip_seat_assignments', 'client_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addConstraint('trip_seat_assignments', {
      fields: ['client_id'],
      type: 'foreign key',
      name: 'trip_seat_assignments_client_id_fk',
      references: {
        table: 'clients',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `trip_seat_assignments` DROP FOREIGN KEY `trip_seat_assignments_client_id_fk`'
    );
    await queryInterface.changeColumn('trip_seat_assignments', 'client_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.addConstraint('trip_seat_assignments', {
      fields: ['client_id'],
      type: 'foreign key',
      name: 'trip_seat_assignments_client_id_fk',
      references: {
        table: 'clients',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },
};
