'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hotels', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      total_single_rooms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_double_rooms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_triple_rooms: {
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
    await queryInterface.addIndex('hotels', ['company_id'], { name: 'hotels_company_id_idx' });

    await queryInterface.createTable('trip_hotels', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trips', key: 'id' },
        onDelete: 'CASCADE',
      },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'CASCADE',
      },
      check_in_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      reserved_singles: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reserved_doubles: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reserved_triples: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('trip_hotels', ['trip_id'], { name: 'trip_hotels_trip_id_idx' });
    await queryInterface.addIndex('trip_hotels', ['hotel_id'], { name: 'trip_hotels_hotel_id_idx' });

    await queryInterface.createTable('trip_hotel_rooms', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      trip_hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trip_hotels', key: 'id' },
        onDelete: 'CASCADE',
      },
      room_type: {
        type: Sequelize.ENUM('single', 'double', 'triple'),
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(128),
        allowNull: false,
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
    await queryInterface.addIndex('trip_hotel_rooms', ['trip_hotel_id'], { name: 'trip_hotel_rooms_trip_hotel_id_idx' });

    await queryInterface.createTable('trip_hotel_room_assignments', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      trip_hotel_room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trip_hotel_rooms', key: 'id' },
        onDelete: 'CASCADE',
      },
      participant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trip_participants', key: 'id' },
        onDelete: 'CASCADE',
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
    await queryInterface.addIndex('trip_hotel_room_assignments', ['trip_hotel_room_id', 'participant_id'], {
      unique: true,
      name: 'trip_hotel_room_assignments_room_participant_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trip_hotel_room_assignments');
    await queryInterface.dropTable('trip_hotel_rooms');
    await queryInterface.dropTable('trip_hotels');
    await queryInterface.dropTable('hotels');
  },
};
