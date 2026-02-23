'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('client_group_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'client_groups',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
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

    await queryInterface.addIndex('client_group_members', ['group_id']);
    await queryInterface.addIndex('client_group_members', ['client_id']);
    await queryInterface.addIndex('client_group_members', ['group_id', 'client_id'], {
      unique: true,
      name: 'client_group_members_group_client_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('client_group_members');
  },
};
