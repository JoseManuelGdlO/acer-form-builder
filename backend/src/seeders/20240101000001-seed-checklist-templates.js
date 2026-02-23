'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [companies] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE slug = 'saru' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyId = Array.isArray(companies) && companies[0] ? companies[0].id : null;
    if (!companyId) {
      console.log('Default company (saru) not found. Run migrations first.');
      return;
    }

    await queryInterface.bulkInsert('checklist_templates', [
      { id: Sequelize.literal('UUID()'), company_id: companyId, label: 'Derecho a visa', order: 0, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('UUID()'), company_id: companyId, label: 'Cita agendada', order: 1, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('UUID()'), company_id: companyId, label: 'Contacto cliente previo a cita', order: 2, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('UUID()'), company_id: companyId, label: 'Pegado y listo para viaje', order: 3, is_active: true, created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('checklist_templates', null, {});
  },
};
