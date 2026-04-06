import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FinanceExpenseAttributes {
  id: string;
  companyId: string;
  amount: number;
  expenseDate: string;
  concept: string;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FinanceExpenseCreationAttributes
  extends Optional<FinanceExpenseAttributes, 'id' | 'note' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

export class FinanceExpense extends Model<FinanceExpenseAttributes, FinanceExpenseCreationAttributes> implements FinanceExpenseAttributes {
  public id!: string;
  public companyId!: string;
  public amount!: number;
  public expenseDate!: string;
  public concept!: string;
  public note?: string | null;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FinanceExpense.init(
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
    concept: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    tableName: 'finance_expenses',
    timestamps: true,
    underscored: true,
  }
);
