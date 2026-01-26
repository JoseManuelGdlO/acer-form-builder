import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { User } from './User';

interface ClientNoteAttributes {
  id: string;
  clientId: string;
  content: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientNoteCreationAttributes extends Optional<ClientNoteAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ClientNote extends Model<ClientNoteAttributes, ClientNoteCreationAttributes> implements ClientNoteAttributes {
  public id!: string;
  public clientId!: string;
  public content!: string;
  public createdBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientNote.init(
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
    createdBy: {
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
    tableName: 'client_notes',
    timestamps: true,
    underscored: true,
  }
);
