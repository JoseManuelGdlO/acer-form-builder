import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { ChecklistTemplate } from './ChecklistTemplate';

interface ClientChecklistAttributes {
  id: string;
  companyId: string;
  clientId: string;
  templateId: string;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientChecklistCreationAttributes extends Optional<ClientChecklistAttributes, 'id' | 'isCompleted' | 'createdAt' | 'updatedAt'> {}

export class ClientChecklist extends Model<ClientChecklistAttributes, ClientChecklistCreationAttributes> implements ClientChecklistAttributes {
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public templateId!: string;
  public isCompleted!: boolean;
  public completedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientChecklist.init(
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
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Client,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: ChecklistTemplate,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'client_checklist',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['client_id', 'template_id'],
      },
    ],
  }
);
