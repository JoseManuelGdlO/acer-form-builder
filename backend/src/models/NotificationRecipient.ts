import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface NotificationRecipientAttributes {
  id: string;
  companyId: string;
  notificationId: string;
  recipientUserId: string;
  readAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationRecipientCreationAttributes
  extends Optional<NotificationRecipientAttributes, 'id' | 'readAt' | 'createdAt' | 'updatedAt'> {}

export class NotificationRecipient
  extends Model<NotificationRecipientAttributes, NotificationRecipientCreationAttributes>
  implements NotificationRecipientAttributes
{
  public id!: string;
  public companyId!: string;
  public notificationId!: string;
  public recipientUserId!: string;
  public readAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NotificationRecipient.init(
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
    notificationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'notifications',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'notification_id',
    },
    recipientUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'recipient_user_id',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at',
    },
  },
  {
    sequelize,
    tableName: 'notification_recipients',
    timestamps: true,
    underscored: true,
  }
);

