'use strict';

const crypto = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Obtener el primer company_id de la tabla companies
    const companies = await queryInterface.sequelize.query(
      `SELECT id FROM companies LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let companyId;
    if (companies && companies.length > 0) {
      companyId = companies[0].id;
    } else {
      // Si no existe ninguna compañía, crear una por defecto
      companyId = crypto.randomUUID();
      await queryInterface.bulkInsert('companies', [
        {
          id: companyId,
          name: 'Compañía Principal',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }

    const templates = [
      { label: 'Derecho a visa', order: 0 },
      { label: 'Cita agendada', order: 1 },
      { label: 'Contacto cliente previo a cita', order: 2 },
      { label: 'Pegado y listo para viaje', order: 3 },
    ];

    await queryInterface.bulkInsert(
      'checklist_templates',
      templates.map((t) => ({
        id: Sequelize.literal('UUID()'),
        label: t.label,
        order: t.order,
        is_active: true,
        company_id: companyId,
        created_at: new Date(),
        updated_at: new Date(),
      }))
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('checklist_templates', null, {});
  },
};
