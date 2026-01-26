'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('checklist_templates', [
      {
        id: Sequelize.literal('UUID()'),
        label: 'Derecho a visa',
        order: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: Sequelize.literal('UUID()'),
        label: 'Cita agendada',
        order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: Sequelize.literal('UUID()'),
        label: 'Contacto cliente previo a cita',
        order: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: Sequelize.literal('UUID()'),
        label: 'Pegado y listo para viaje',
        order: 3,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('checklist_templates', null, {});
  },
};
