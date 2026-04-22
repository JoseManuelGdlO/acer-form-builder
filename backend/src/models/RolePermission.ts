import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Role } from './Role';
import { Permission } from './Permission';

interface RolePermissionAttributes {
  roleId: string;
  permissionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RolePermissionCreationAttributes
  extends Optional<RolePermissionAttributes, 'createdAt' | 'updatedAt'> {}

export class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
  implements RolePermissionAttributes
{
  public roleId!: string;
  public permissionId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RolePermission.init(
  {
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: Role, key: 'id' },
      onDelete: 'CASCADE',
      field: 'role_id',
    },
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: Permission, key: 'id' },
      onDelete: 'CASCADE',
      field: 'permission_id',
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
  }
);
