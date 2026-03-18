import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ProductCategoryAttributes {
  id: string;
  productId: string;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCategoryCreationAttributes
  extends Optional<ProductCategoryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ProductCategory
  extends Model<ProductCategoryAttributes, ProductCategoryCreationAttributes>
  implements ProductCategoryAttributes
{
  public id!: string;
  public productId!: string;
  public category!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'product_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['product_id', 'category'],
        unique: true,
      },
    ],
  }
);

