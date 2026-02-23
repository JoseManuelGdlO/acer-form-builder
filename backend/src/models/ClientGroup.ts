import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

interface ClientGroupAttributes {
  id: string;
  title: string;
  assignedUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientGroupCreationAttributes extends Optional<ClientGroupAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ClientGroup extends Model<ClientGroupAttributes, ClientGroupCreationAttributes> implements ClientGroupAttributes {
  public id!: string;
  public title!: string;
  public assignedUserId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientGroup.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    assignedUserId: {
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
    tableName: 'client_groups',
    timestamps: true,
    underscored: true,
  }
);
