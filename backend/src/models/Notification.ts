import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface NotificationAttributes {
  id: string;
  companyId: string;
  type: string;
  title?: string | null;
  message: string;
  data?: Record<string, unknown> | null;
  actionUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'title' | 'data' | 'actionUrl' | 'createdAt' | 'updatedAt'> {}

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: string;
  public companyId!: string;
  public type!: string;
  public title!: string | null;
  public message!: string;
  public data!: Record<string, unknown> | null;
  public actionUrl!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'company_id',
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    actionUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'action_url',
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
  }
);

