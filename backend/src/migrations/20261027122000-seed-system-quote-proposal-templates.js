'use strict';

const TEMPLATES = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Hotel',
    description: 'Propuesta enfocada en hospedaje',
    service_type: 'lodging',
    sort_order: 0,
    blocks: [
      {
        id: 'b1000000-0000-4000-8000-000000000001',
        block_type: 'hotel',
        title: 'Hospedaje',
        body: 'Describe el hotel, categoría y plan de alimentos.',
        sort_order: 0,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000002',
        block_type: 'section',
        title: 'Incluye orientación',
        body: 'Servicios destacados y beneficios para el viajero.',
        sort_order: 1,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000003',
        block_type: 'custom',
        title: 'Notas',
        body: 'Observaciones comerciales o de operación.',
        sort_order: 2,
      },
    ],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Paquete',
    description: 'Propuesta de paquete turístico',
    service_type: 'package',
    sort_order: 1,
    blocks: [
      {
        id: 'b1000000-0000-4000-8000-000000000011',
        block_type: 'section',
        title: 'Resumen',
        body: 'Resumen del paquete y duración.',
        sort_order: 0,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000012',
        block_type: 'itinerary',
        title: 'Itinerario',
        body: 'Día a día sugerido.',
        sort_order: 1,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000013',
        block_type: 'hotel',
        title: 'Hotel',
        body: 'Alojamiento incluido en el paquete.',
        sort_order: 2,
      },
    ],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Circuito',
    description: 'Propuesta de circuito multi-destino',
    service_type: 'circuit',
    sort_order: 2,
    blocks: [
      {
        id: 'b1000000-0000-4000-8000-000000000021',
        block_type: 'itinerary',
        title: 'Recorrido',
        body: 'Ciudades y traslados del circuito.',
        sort_order: 0,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000022',
        block_type: 'activities',
        title: 'Actividades',
        body: 'Experiencias y visitas incluidas.',
        sort_order: 1,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000023',
        block_type: 'hotel',
        title: 'Hospedaje',
        body: 'Hoteles por ciudad.',
        sort_order: 2,
      },
    ],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Vuelo',
    description: 'Propuesta centrada en vuelos y traslados',
    service_type: 'flight',
    sort_order: 3,
    blocks: [
      {
        id: 'b1000000-0000-4000-8000-000000000031',
        block_type: 'section',
        title: 'Vuelos',
        body: 'Itinerario aéreo propuesto.',
        sort_order: 0,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000032',
        block_type: 'section',
        title: 'Traslados',
        body: 'Traslados aeropuerto–hotel u otros.',
        sort_order: 1,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000033',
        block_type: 'custom',
        title: 'Notas',
        body: 'Equipaje, escalas y condiciones.',
        sort_order: 2,
      },
    ],
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(
      'SELECT id, name FROM quote_proposal_templates WHERE is_system = true AND company_id IS NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingIds = new Set(existing.map((r) => r.id));
    const existingNames = new Set(existing.map((r) => r.name));

    const templatesToInsert = [];
    const blocksToInsert = [];

    for (const tpl of TEMPLATES) {
      if (existingIds.has(tpl.id) || existingNames.has(tpl.name)) continue;
      templatesToInsert.push({
        id: tpl.id,
        company_id: null,
        name: tpl.name,
        description: tpl.description,
        service_type: tpl.service_type,
        is_system: true,
        is_active: true,
        sort_order: tpl.sort_order,
        created_at: now,
        updated_at: now,
      });
      for (const block of tpl.blocks) {
        blocksToInsert.push({
          id: block.id,
          proposal_template_id: tpl.id,
          block_type: block.block_type,
          title: block.title,
          body: block.body,
          image_url: null,
          sort_order: block.sort_order,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (templatesToInsert.length) {
      await queryInterface.bulkInsert('quote_proposal_templates', templatesToInsert);
    }
    if (blocksToInsert.length) {
      await queryInterface.bulkInsert('quote_proposal_blocks', blocksToInsert);
    }
  },

  async down(queryInterface) {
    const ids = TEMPLATES.map((t) => t.id);
    await queryInterface.bulkDelete('quote_proposal_blocks', {
      proposal_template_id: ids,
    });
    await queryInterface.bulkDelete('quote_proposal_templates', { id: ids });
  },
};
