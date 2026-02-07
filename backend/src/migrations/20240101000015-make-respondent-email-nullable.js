'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('form_submissions', 'respondent_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('form_submissions', 'respondent_email', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
