import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { User } from './User';

interface ClientPaymentDeletedLogAttributes {
  id: string;
  companyId: string;
  clientId: string;
  paymentId: string;
  tripId?: string | null;
  acquiredPackageId?: string | null;
  amount: number;
  paymentDate: string;
  paymentType: string;
  referenceNumber?: string | null;
  note?: string | null;
  deletedBy?: string | null;
  createdAt?: Date;
}

interface ClientPaymentDeletedLogCreationAttributes
  extends Optional<ClientPaymentDeletedLogAttributes, 'id' | 'note' | 'tripId' | 'acquiredPackageId' | 'createdAt'> {}

export class ClientPaymentDeletedLog extends Model<ClientPaymentDeletedLogAttributes, ClientPaymentDeletedLogCreationAttributes> implements ClientPaymentDeletedLogAttributes {
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public paymentId!: string;
  public tripId?: string | null;
  public acquiredPackageId?: string | null;
  public amount!: number;
  public paymentDate!: string;
  public paymentType!: string;
  public referenceNumber?: string | null;
  public note?: string | null;
  public deletedBy?: string | null;
  public readonly createdAt!: Date;
}

ClientPaymentDeletedLog.init(
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
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    tripId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    acquiredPackageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'client_acquired_packages',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deletedBy: {
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
    tableName: 'client_payment_deleted_log',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
