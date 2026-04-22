import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

interface RoleAttributes {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  systemKey?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes
  extends Optional<RoleAttributes, 'id' | 'description' | 'isSystem' | 'systemKey' | 'createdAt' | 'updatedAt'> {}

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public description?: string | null;
  public isSystem!: boolean;
  public systemKey?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    systemKey: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'system_key',
    },
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: true,
    underscored: true,
  }
);
