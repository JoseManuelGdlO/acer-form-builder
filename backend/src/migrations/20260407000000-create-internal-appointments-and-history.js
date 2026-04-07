'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('internal_appointments', {
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
      appointment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      appointed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      office_role: {
        type: Sequelize.ENUM('reviewer', 'admin'),
        allowNull: false,
      },
      purpose_note: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('internal_appointments', ['company_id']);
    await queryInterface.addIndex('internal_appointments', ['client_id']);
    await queryInterface.addIndex('internal_appointments', ['appointment_date']);
    await queryInterface.addIndex('internal_appointments', ['status']);

    await queryInterface.createTable('internal_appointment_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'internal_appointments', key: 'id' },
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.ENUM('created', 'updated', 'status_changed', 'deleted'),
        allowNull: false,
      },
      changed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      before_json: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      after_json: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('internal_appointment_history', ['appointment_id']);
    await queryInterface.addIndex('internal_appointment_history', ['company_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('internal_appointment_history');
    await queryInterface.dropTable('internal_appointments');
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_internal_appointment_history_action;"
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_internal_appointments_office_role;"
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_internal_appointments_status;"
    );
  },
};
