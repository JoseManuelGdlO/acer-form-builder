import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CommissionSettingAttributes {
  id: string;
  companyId: string;
  defaultRatePct: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CommissionSettingCreationAttributes
  extends Optional<CommissionSettingAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CommissionSetting
  extends Model<CommissionSettingAttributes, CommissionSettingCreationAttributes>
  implements CommissionSettingAttributes
{
  public id!: string;
  public companyId!: string;
  public defaultRatePct!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CommissionSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    defaultRatePct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      get() {
        const value = this.getDataValue('defaultRatePct');
        return value != null ? parseFloat(String(value)) : value;
      },
    },
  },
  {
    sequelize,
    tableName: 'company_commission_settings',
    timestamps: true,
    underscored: true,
  }
);
