'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'form_submissions',
      'respondent_phone',
      {
        type: Sequelize.STRING(50),
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('form_submissions', 'respondent_phone');
  },
};
