import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ConversationsAttributes {
  id: number;
  fkid_clients: string;
  fecha: Date;
  hora: Date;
  from: 'usuario' | 'bot';
  mensaje: string;
  baja_logica: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationsCreationAttributes
  extends Optional<
    ConversationsAttributes,
    'id' | 'baja_logica' | 'createdAt' | 'updatedAt'
  > {}

export class ConversacionChat
  extends Model<ConversationsAttributes, ConversationsCreationAttributes>
  implements ConversationsAttributes
{
  public id!: number;
  public fkid_clients!: string;
  public fecha!: Date;
  public hora!: Date;
  public from!: 'usuario' | 'bot';
  public mensaje!: string;
  public baja_logica!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ConversacionChat.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fkid_clients: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    from: {
      type: DataTypes.ENUM('usuario', 'bot'),
      allowNull: false,
      defaultValue: 'usuario',
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    baja_logica: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'conversations',
    timestamps: true,
    underscored: true,
  }
);
