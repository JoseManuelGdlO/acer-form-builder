import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { User } from './User';

interface ClientAmountDueLogAttributes {
  id: string;
  companyId: string;
  clientId: string;
  previousValue?: number | null;
  newValue?: number | null;
  changedBy?: string | null;
  createdAt?: Date;
}

interface ClientAmountDueLogCreationAttributes extends Optional<ClientAmountDueLogAttributes, 'id' | 'createdAt'> {}

export class ClientAmountDueLog extends Model<ClientAmountDueLogAttributes, ClientAmountDueLogCreationAttributes> implements ClientAmountDueLogAttributes {
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public previousValue?: number | null;
  public newValue?: number | null;
  public changedBy?: string | null;
  public readonly createdAt!: Date;
}

ClientAmountDueLog.init(
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
    previousValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('previousValue');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
    newValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('newValue');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'client_amount_due_log',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
