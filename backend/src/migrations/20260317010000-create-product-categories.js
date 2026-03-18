'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('(UUID())'),
        primaryKey: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Acelera búsquedas por categoría
    await queryInterface.addIndex('product_categories', ['category']);

    // Evita duplicados por producto-categoría
    await queryInterface.addIndex('product_categories', ['product_id', 'category'], {
      unique: true,
      name: 'product_categories_product_category_unique',
    });

    // Acelera join por producto
    await queryInterface.addIndex('product_categories', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_categories');
  },
};

