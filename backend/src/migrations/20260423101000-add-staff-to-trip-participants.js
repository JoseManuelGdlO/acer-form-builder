'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('trip_participants');

    if (!table.staff_member_id) {
      await queryInterface.addColumn('trip_participants', 'staff_member_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'staff_members',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    if (!table.role) {
      await queryInterface.addColumn('trip_participants', 'role', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE trip_participants
      MODIFY participant_type ENUM('client', 'companion', 'staff') NOT NULL DEFAULT 'client'
    `);

    const indexes = await queryInterface.showIndex('trip_participants');
    const hasStaffIndex = indexes.some((idx) => idx.name === 'trip_participants_trip_staff_member_unique');
    if (!hasStaffIndex) {
      await queryInterface.addIndex('trip_participants', ['trip_id', 'staff_member_id'], {
        unique: true,
        name: 'trip_participants_trip_staff_member_unique',
        where: {
          staff_member_id: {
            [Sequelize.Op.ne]: null,
          },
        },
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('trip_participants');
    const hasStaffIndex = indexes.some((idx) => idx.name === 'trip_participants_trip_staff_member_unique');
    if (hasStaffIndex) {
      await queryInterface.removeIndex('trip_participants', 'trip_participants_trip_staff_member_unique');
    }

    const table = await queryInterface.describeTable('trip_participants');
    if (table.role) {
      await queryInterface.removeColumn('trip_participants', 'role');
    }
    if (table.staff_member_id) {
      await queryInterface.removeColumn('trip_participants', 'staff_member_id');
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE trip_participants
      MODIFY participant_type ENUM('client', 'companion') NOT NULL DEFAULT 'client'
    `);
  },
};
