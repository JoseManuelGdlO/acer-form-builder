'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('trip_participants', 'client_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('trip_participants', 'participant_type', {
      type: Sequelize.ENUM('client', 'companion'),
      allowNull: false,
      defaultValue: 'client',
    });

    await queryInterface.addColumn('trip_participants', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('trip_participants', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.removeIndex('trip_participants', 'trip_participants_trip_client_unique');
    await queryInterface.addIndex('trip_participants', ['trip_id', 'client_id'], {
      unique: true,
      name: 'trip_participants_trip_client_unique',
      where: {
        client_id: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('trip_participants', 'trip_participants_trip_client_unique');
    await queryInterface.addIndex('trip_participants', ['trip_id', 'client_id'], {
      unique: true,
      name: 'trip_participants_trip_client_unique',
    });

    await queryInterface.removeColumn('trip_participants', 'phone');
    await queryInterface.removeColumn('trip_participants', 'name');
    await queryInterface.removeColumn('trip_participants', 'participant_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trip_participants_participant_type";');

    await queryInterface.changeColumn('trip_participants', 'client_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  },
};
