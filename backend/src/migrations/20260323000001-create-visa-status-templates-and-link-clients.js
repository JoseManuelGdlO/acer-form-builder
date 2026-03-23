'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visa_status_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('visa_status_templates', ['company_id']);
    await queryInterface.addIndex('visa_status_templates', ['company_id', 'is_active']);

    await queryInterface.addColumn('clients', 'visa_status_template_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'visa_status_templates',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('clients', ['visa_status_template_id']);

    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies'
    );

    const templates = [];
    const templateMapByCompany = new Map();

    for (const company of companies) {
      const companyId = company.id;
      const approvedId = randomUUID();
      const deniedId = randomUUID();
      const inProgressId = randomUUID();
      templateMapByCompany.set(companyId, { approvedId, deniedId, inProgressId });

      templates.push(
        {
          id: approvedId,
          company_id: companyId,
          label: 'Aprobada',
          order: 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: deniedId,
          company_id: companyId,
          label: 'Negada',
          order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: inProgressId,
          company_id: companyId,
          label: 'En proceso',
          order: 2,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      );
    }

    if (templates.length > 0) {
      await queryInterface.bulkInsert('visa_status_templates', templates);
    }

    for (const [companyId, statusIds] of templateMapByCompany.entries()) {
      await queryInterface.bulkUpdate(
        'clients',
        { visa_status_template_id: statusIds.approvedId },
        { company_id: companyId, status: 'active' }
      );
      await queryInterface.bulkUpdate(
        'clients',
        { visa_status_template_id: statusIds.deniedId },
        { company_id: companyId, status: 'inactive' }
      );
      await queryInterface.bulkUpdate(
        'clients',
        { visa_status_template_id: statusIds.inProgressId },
        { company_id: companyId, status: 'pending' }
      );
    }

    await queryInterface.changeColumn('clients', 'visa_status_template_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'visa_status_templates',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', ['visa_status_template_id']);
    await queryInterface.removeColumn('clients', 'visa_status_template_id');
    await queryInterface.dropTable('visa_status_templates');
  },
};
