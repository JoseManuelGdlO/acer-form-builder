'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('clients', ['phone'], {
      unique: true,
      name: 'clients_phone_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', 'clients_phone_unique');
  },
};
