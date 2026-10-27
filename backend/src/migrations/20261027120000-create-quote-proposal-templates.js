'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quote_proposal_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      service_type: {
        type: Sequelize.ENUM('lodging', 'package', 'flight', 'circuit'),
        allowNull: true,
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('quote_proposal_templates', ['company_id']);
    await queryInterface.addIndex('quote_proposal_templates', ['is_system']);
    await queryInterface.addIndex('quote_proposal_templates', ['is_active']);

    await queryInterface.createTable('quote_proposal_blocks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      proposal_template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'quote_proposal_templates', key: 'id' },
        onDelete: 'CASCADE',
      },
      block_type: {
        type: Sequelize.ENUM('section', 'itinerary', 'hotel', 'activities', 'custom'),
        allowNull: false,
        defaultValue: 'custom',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('quote_proposal_blocks', ['proposal_template_id']);

    await queryInterface.addColumn('quotes', 'proposal_template_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'quote_proposal_templates', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('quotes', 'proposal_blocks_snapshot', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.addIndex('quotes', ['proposal_template_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('quotes', ['proposal_template_id']).catch(() => {});
    await queryInterface.removeColumn('quotes', 'proposal_blocks_snapshot');
    await queryInterface.removeColumn('quotes', 'proposal_template_id');
    await queryInterface.dropTable('quote_proposal_blocks');
    await queryInterface.dropTable('quote_proposal_templates');
  },
};
