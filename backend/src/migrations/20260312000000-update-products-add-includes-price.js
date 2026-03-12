'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Añadir columna "includes" (Qué incluye) como TEXT obligatorio
    await queryInterface.addColumn('products', 'includes', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    // Añadir columna "price" como entero obligatorio (sin decimales)
    await queryInterface.addColumn('products', 'price', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // Hacer opcionales description y requirements
    await queryInterface.changeColumn('products', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('products', 'requirements', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertir nulabilidad de description y requirements
    await queryInterface.changeColumn('products', 'description', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.changeColumn('products', 'requirements', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    // Eliminar columnas nuevas
    await queryInterface.removeColumn('products', 'includes');
    await queryInterface.removeColumn('products', 'price');
  },
};

