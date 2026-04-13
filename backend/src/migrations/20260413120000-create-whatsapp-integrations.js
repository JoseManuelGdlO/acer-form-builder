'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('whatsapp_integrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phone_number_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'ID de la línea en Meta (Cloud API)',
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Token de acceso de Graph para esta línea',
      },
      graph_api_version: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'v24.0',
      },
      template_language: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'es_MX',
      },
      initial_template_name: {
        type: Sequelize.STRING(128),
        allowNull: false,
        defaultValue: 'mensaje_inicial',
        comment: 'Plantilla para reabrir ventana de 24h cuando aplica',
      },
      display_phone_number: {
        type: Sequelize.STRING(32),
        allowNull: true,
        comment: 'Número legible solo para soporte/UI',
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

    await queryInterface.addIndex('whatsapp_integrations', ['company_id'], {
      unique: true,
      name: 'whatsapp_integrations_company_id_unique',
    });
    await queryInterface.addIndex('whatsapp_integrations', ['phone_number_id'], {
      unique: true,
      name: 'whatsapp_integrations_phone_number_id_unique',
    });
    await queryInterface.addIndex('whatsapp_integrations', ['is_active'], {
      name: 'whatsapp_integrations_is_active_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_integrations');
  },
};
