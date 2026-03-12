'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_companies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id',
        },
        onDelete: 'CASCADE',
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('trip_companies', ['trip_id']);
    await queryInterface.addIndex('trip_companies', ['company_id']);
    await queryInterface.addIndex('trip_companies', ['trip_id', 'company_id'], {
      unique: true,
      name: 'trip_companies_trip_company_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trip_companies');
  },
};
