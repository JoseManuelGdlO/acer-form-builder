'use strict';

/** Hora opcional para citas internas (HH:mm), para calendario y ordenación */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('internal_appointments', 'appointment_time', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('internal_appointments', 'appointment_time');
  },
};
