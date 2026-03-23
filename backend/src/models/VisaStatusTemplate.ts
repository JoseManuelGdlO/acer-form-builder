import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VisaStatusTemplateAttributes {
  id: string;
  companyId: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VisaStatusTemplateCreationAttributes extends Optional<VisaStatusTemplateAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class VisaStatusTemplate extends Model<VisaStatusTemplateAttributes, VisaStatusTemplateCreationAttributes> implements VisaStatusTemplateAttributes {
  public id!: string;
  public companyId!: string;
  public label!: string;
  public order!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VisaStatusTemplate.init(
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
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    tableName: 'visa_status_templates',
    timestamps: true,
    underscored: true,
  }
);
