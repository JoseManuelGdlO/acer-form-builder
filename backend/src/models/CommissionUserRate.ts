import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type CommissionRateType = 'percentage' | 'fixed';

interface CommissionUserRateAttributes {
  id: string;
  companyId: string;
  userId: string;
  rateType: CommissionRateType;
  ratePct: number;
  fixedAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CommissionUserRateCreationAttributes
  extends Optional<CommissionUserRateAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CommissionUserRate
  extends Model<CommissionUserRateAttributes, CommissionUserRateCreationAttributes>
  implements CommissionUserRateAttributes
{
  public id!: string;
  public companyId!: string;
  public userId!: string;
  public rateType!: CommissionRateType;
  public ratePct!: number;
  public fixedAmount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CommissionUserRate.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    rateType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'percentage',
    },
    ratePct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      get() {
        const value = this.getDataValue('ratePct');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
    fixedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const value = this.getDataValue('fixedAmount');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
  },
  {
    sequelize,
    tableName: 'commission_user_rates',
    timestamps: true,
    underscored: true,
  }
);
