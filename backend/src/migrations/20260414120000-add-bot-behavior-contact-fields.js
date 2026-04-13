'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bot_behavior', 'branches_text', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('bot_behavior', 'social_links', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('bot_behavior', 'contact_phone', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bot_behavior', 'contact_phone');
    await queryInterface.removeColumn('bot_behavior', 'social_links');
    await queryInterface.removeColumn('bot_behavior', 'branches_text');
  },
};
