'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'visa_cas_appointment_location', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('clients', 'visa_consular_appointment_location', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clients', 'visa_consular_appointment_location');
    await queryInterface.removeColumn('clients', 'visa_cas_appointment_location');
  },
};
