import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

interface UserRoleAttributes {
  id: string;
  userId: string;
  role: 'super_admin' | 'reviewer';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public id!: string;
  public userId!: string;
  public role!: 'super_admin' | 'reviewer';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserRole.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'reviewer'),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'user_roles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role'],
      },
    ],
  }
);
