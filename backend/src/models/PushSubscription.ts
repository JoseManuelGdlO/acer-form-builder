import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PushSubscriptionAttributes {
  id: string;
  companyId: string;
  userId: string;
  endpoint: string;
  keysAuth: string;
  keysP256dh: string;
  lastSeenAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PushSubscriptionCreationAttributes
  extends Optional<PushSubscriptionAttributes, 'id' | 'lastSeenAt' | 'createdAt' | 'updatedAt'> {}

export class PushSubscription
  extends Model<PushSubscriptionAttributes, PushSubscriptionCreationAttributes>
  implements PushSubscriptionAttributes
{
  public id!: string;
  public companyId!: string;
  public userId!: string;
  public endpoint!: string;
  public keysAuth!: string;
  public keysP256dh!: string;
  public lastSeenAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PushSubscription.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'user_id',
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    keysAuth: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'keys_auth',
    },
    keysP256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'keys_p256dh',
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_seen_at',
    },
  },
  {
    sequelize,
    tableName: 'push_subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'user_id', 'endpoint'],
      },
    ],
  }
);

