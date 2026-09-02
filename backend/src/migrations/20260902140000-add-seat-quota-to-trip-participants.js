'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trip_participants', 'seats_allowed', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.addColumn('trip_participants', 'linked_client_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('trip_participants', ['trip_id', 'linked_client_id'], {
      name: 'trip_participants_trip_linked_client_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trip_participants', 'trip_participants_trip_linked_client_idx');
    await queryInterface.removeColumn('trip_participants', 'linked_client_id');
    await queryInterface.removeColumn('trip_participants', 'seats_allowed');
  },
};
