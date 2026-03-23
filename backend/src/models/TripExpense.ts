import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripExpenseAttributes {
  id: string;
  companyId: string;
  tripId: string;
  amount: number;
  expenseDate: string;
  category?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripExpenseCreationAttributes extends Optional<TripExpenseAttributes, 'id' | 'category' | 'referenceNumber' | 'note' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

export class TripExpense extends Model<TripExpenseAttributes, TripExpenseCreationAttributes> implements TripExpenseAttributes {
  public id!: string;
  public companyId!: string;
  public tripId!: string;
  public amount!: number;
  public expenseDate!: string;
  public category?: string | null;
  public referenceNumber?: string | null;
  public note?: string | null;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TripExpense.init(
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
    tripId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'trips',
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
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'trip_expenses',
    timestamps: true,
    underscored: true,
  }
);
