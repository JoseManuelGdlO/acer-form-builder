'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'visa_cas_appointment_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('clients', 'visa_consular_appointment_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clients', 'visa_consular_appointment_date');
    await queryInterface.removeColumn('clients', 'visa_cas_appointment_date');
  },
};
