'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('conversations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      fecha: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      hora: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      from: {
        type: Sequelize.ENUM('usuario', 'bot'),
        allowNull: false,
        defaultValue: 'usuario',
      },
      mensaje: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      baja_logica: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ),
      },
    });

    await queryInterface.addIndex('conversations', ['phone']);
    await queryInterface.addIndex('conversations', ['fecha']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('conversations', ['phone']);
    await queryInterface.removeIndex('conversations', ['fecha']);
    await queryInterface.dropTable('conversations'); 
  },
};

