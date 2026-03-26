'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('clients', 'clients_phone_unique');
    await queryInterface.addIndex('clients', ['phone'], {
      unique: false,
      name: 'clients_phone_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', 'clients_phone_idx');
    await queryInterface.addIndex('clients', ['phone'], {
      unique: true,
      name: 'clients_phone_unique',
    });
  },
};
