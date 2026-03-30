import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    required: boolean;
    options?: Array<{ id: string; label: string }>;
  }>;
}

interface FormAttributes {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  sections: FormSection[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FormCreationAttributes
  extends Optional<FormAttributes, 'id' | 'sections' | 'isDeleted' | 'createdAt' | 'updatedAt'> {}

export class Form extends Model<FormAttributes, FormCreationAttributes> implements FormAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public description?: string;
  public sections!: FormSection[];
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Form.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sections: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
  },
  {
    sequelize,
    tableName: 'forms',
    timestamps: true,
    underscored: true,
  }
);
