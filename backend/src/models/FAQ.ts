import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FAQAttributes {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FAQCreationAttributes extends Optional<FAQAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FAQ extends Model<FAQAttributes, FAQCreationAttributes> implements FAQAttributes {
  public id!: string;
  public companyId!: string;
  public question!: string;
  public answer!: string;
  public category?: string;
  public order!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FAQ.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'faqs',
    timestamps: true,
    underscored: true,
  }
);
