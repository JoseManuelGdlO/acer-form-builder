'use strict';

/** Ensure trip_participants.client_id is nullable (staff/companions). */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop FK first so MySQL accepts the column change cleanly.
    const [fks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'trip_participants'
        AND COLUMN_NAME = 'client_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of fks) {
      const name = row.CONSTRAINT_NAME;
      await queryInterface.sequelize.query(
        `ALTER TABLE \`trip_participants\` DROP FOREIGN KEY \`${name}\``
      );
    }

    await queryInterface.changeColumn('trip_participants', 'client_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addConstraint('trip_participants', {
      fields: ['client_id'],
      type: 'foreign key',
      name: 'trip_participants_client_id_fk',
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
      'ALTER TABLE `trip_participants` DROP FOREIGN KEY `trip_participants_client_id_fk`'
    );
    await queryInterface.changeColumn('trip_participants', 'client_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.addConstraint('trip_participants', {
      fields: ['client_id'],
      type: 'foreign key',
      name: 'trip_participants_client_id_fk',
      references: {
        table: 'clients',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },
};
