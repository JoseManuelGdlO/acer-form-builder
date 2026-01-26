import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { User } from './User';

interface ClientMessageAttributes {
  id: string;
  clientId: string;
  content: string;
  sender: 'user' | 'client';
  senderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientMessageCreationAttributes extends Optional<ClientMessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ClientMessage extends Model<ClientMessageAttributes, ClientMessageCreationAttributes> implements ClientMessageAttributes {
  public id!: string;
  public clientId!: string;
  public content!: string;
  public sender!: 'user' | 'client';
  public senderId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sender: {
      type: DataTypes.ENUM('user', 'client'),
      allowNull: false,
    },
    senderId: {
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
    tableName: 'client_messages',
    timestamps: true,
    underscored: true,
  }
);
