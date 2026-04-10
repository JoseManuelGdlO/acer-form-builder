import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ConversationsAttributes {
  id: number;
  companyId?: string | null;
  phone: string;
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
    'id' | 'companyId' | 'baja_logica' | 'createdAt' | 'updatedAt'
  > {}

export class Conversations
  extends Model<ConversationsAttributes, ConversationsCreationAttributes>
  implements ConversationsAttributes
{
  public id!: number;
  public companyId!: string | null;
  public phone!: string;
  public fecha!: Date;
  public hora!: Date;
  public from!: 'usuario' | 'bot';
  public mensaje!: string;
  public baja_logica!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversations.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    phone: {
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
      field: 'from',
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
