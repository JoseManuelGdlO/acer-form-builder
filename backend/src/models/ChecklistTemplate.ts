import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ChecklistTemplateAttributes {
  id: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ChecklistTemplateCreationAttributes extends Optional<ChecklistTemplateAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ChecklistTemplate extends Model<ChecklistTemplateAttributes, ChecklistTemplateCreationAttributes> implements ChecklistTemplateAttributes {
  public id!: string;
  public label!: string;
  public order!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChecklistTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    tableName: 'checklist_templates',
    timestamps: true,
    underscored: true,
  }
);
