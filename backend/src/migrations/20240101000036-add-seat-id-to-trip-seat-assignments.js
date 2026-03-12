'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trip_seat_assignments', 'seat_id', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.changeColumn('trip_seat_assignments', 'seat_number', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('trip_seat_assignments', 'seat_id');
    await queryInterface.changeColumn('trip_seat_assignments', 'seat_number', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
