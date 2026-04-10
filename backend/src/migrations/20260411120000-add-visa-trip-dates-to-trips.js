'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trips', 'is_visa_trip', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('trips', 'cas_departure_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('trips', 'cas_return_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('trips', 'consulate_departure_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('trips', 'consulate_return_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trips', 'consulate_return_date');
    await queryInterface.removeColumn('trips', 'consulate_departure_date');
    await queryInterface.removeColumn('trips', 'cas_return_date');
    await queryInterface.removeColumn('trips', 'cas_departure_date');
    await queryInterface.removeColumn('trips', 'is_visa_trip');
  },
};
