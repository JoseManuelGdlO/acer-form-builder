import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { ClientGroup } from './ClientGroup';
import { Client } from './Client';

interface ClientGroupMemberAttributes {
  id: string;
  groupId: string;
  clientId: string;
  createdAt?: Date;
}

interface ClientGroupMemberCreationAttributes extends Optional<ClientGroupMemberAttributes, 'id' | 'createdAt'> {}

export class ClientGroupMember extends Model<ClientGroupMemberAttributes, ClientGroupMemberCreationAttributes> implements ClientGroupMemberAttributes {
  public id!: string;
  public groupId!: string;
  public clientId!: string;
  public readonly createdAt!: Date;
}

ClientGroupMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: ClientGroup,
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
  },
  {
    sequelize,
    tableName: 'client_group_members',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['group_id', 'client_id'],
      },
    ],
  }
);
