import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CommissionPayoutAttributes {
  id: string;
  companyId: string;
  assignedUserId: string;
  amount: number;
  payoutDate: string;
  concept: string;
  periodType?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CommissionPayoutCreationAttributes
  extends Optional<CommissionPayoutAttributes, 'id' | 'note' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

export class CommissionPayout
  extends Model<CommissionPayoutAttributes, CommissionPayoutCreationAttributes>
  implements CommissionPayoutAttributes
{
  public id!: string;
  public companyId!: string;
  public assignedUserId!: string;
  public amount!: number;
  public payoutDate!: string;
  public concept!: string;
  public periodType?: string | null;
  public periodFrom?: string | null;
  public periodTo?: string | null;
  public note?: string | null;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CommissionPayout.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
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
    payoutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    concept: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    periodType: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    periodFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    periodTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'commission_payouts',
    timestamps: true,
    underscored: true,
  }
);
