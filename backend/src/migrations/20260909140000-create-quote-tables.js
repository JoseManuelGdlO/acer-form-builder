'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quotes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      folio: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      service_type: {
        type: Sequelize.ENUM('lodging', 'package', 'flight', 'circuit'),
        allowNull: false,
        defaultValue: 'lodging',
      },
      hotel: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      advisor_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      advisor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      advance_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: 'MXN',
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'registered', 'expired'),
        allowNull: false,
        defaultValue: 'draft',
      },
      origin: {
        type: Sequelize.ENUM('system', 'uploaded'),
        allowNull: false,
        defaultValue: 'system',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      includes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      excludes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      terms: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('quotes', ['company_id']);
    await queryInterface.addIndex('quotes', ['company_id', 'client_id']);
    await queryInterface.addIndex('quotes', ['company_id', 'folio'], {
      unique: true,
      name: 'quotes_company_folio_unique',
    });

    await queryInterface.createTable('quote_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      quote_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'quotes', key: 'id' },
        onDelete: 'CASCADE',
      },
      label: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('quote_events', ['quote_id']);
    await queryInterface.addIndex('quote_events', ['company_id']);

    await queryInterface.createTable('quote_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      contact: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: '',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      footer: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      header_color: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: '#1379BE',
      },
      accent_color: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: '#D51E26',
      },
      show_logo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      includes: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      excludes: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      terms: {
        type: Sequelize.TEXT,
        allowNull: false,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quote_events');
    await queryInterface.dropTable('quote_templates');
    await queryInterface.dropTable('quotes');
  },
};
