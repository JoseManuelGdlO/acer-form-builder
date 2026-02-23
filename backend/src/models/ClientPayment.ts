import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';

export type PaymentType = 'tarjeta' | 'transferencia' | 'efectivo';

interface ClientPaymentAttributes {
  id: string;
  companyId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientPaymentCreationAttributes extends Optional<ClientPaymentAttributes, 'id' | 'note' | 'createdAt' | 'updatedAt'> {}

export class ClientPayment extends Model<ClientPaymentAttributes, ClientPaymentCreationAttributes> implements ClientPaymentAttributes {
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public amount!: number;
  public paymentDate!: string;
  public paymentType!: PaymentType;
  public note?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientPayment.init(
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
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() {
        const value = this.getDataValue('amount');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paymentType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'efectivo',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'client_payments',
    timestamps: true,
    underscored: true,
  }
);
