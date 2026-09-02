'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_reminder_sends', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trips', key: 'id' },
        onDelete: 'CASCADE',
      },
      participant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trip_participants', key: 'id' },
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'clients', key: 'id' },
        onDelete: 'SET NULL',
      },
      send_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      whatsapp_status: {
        type: Sequelize.ENUM('text_sent', 'template_sent', 'skipped_no_phone', 'failed'),
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('trip_reminder_sends', ['trip_id', 'participant_id', 'send_date'], {
      unique: true,
      name: 'trip_reminder_sends_trip_participant_date_unique',
    });
    await queryInterface.addIndex('trip_reminder_sends', ['send_date'], {
      name: 'trip_reminder_sends_send_date_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trip_reminder_sends');
  },
};
