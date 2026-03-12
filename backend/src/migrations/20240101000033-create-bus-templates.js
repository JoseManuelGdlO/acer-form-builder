'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bus_templates', {
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
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      total_seats: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bathroom_position: {
        type: Sequelize.ENUM('front', 'middle', 'back'),
        allowNull: false,
      },
      floors: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      stairs_position: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      seat_labels: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('bus_templates', ['company_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bus_templates');
  },
};
