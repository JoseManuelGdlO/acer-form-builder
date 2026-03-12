import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TripInvitationStatus = 'pending' | 'accepted' | 'rejected';

interface TripInvitationAttributes {
  id: string;
  tripId: string;
  invitedCompanyId: string;
  invitedBy: string;
  status: TripInvitationStatus;
  respondedAt?: Date | null;
  respondedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripInvitationCreationAttributes extends Optional<TripInvitationAttributes, 'id' | 'status' | 'respondedAt' | 'respondedBy' | 'createdAt' | 'updatedAt'> {}

export class TripInvitation extends Model<TripInvitationAttributes, TripInvitationCreationAttributes> implements TripInvitationAttributes {
  public id!: string;
  public tripId!: string;
  public invitedCompanyId!: string;
  public invitedBy!: string;
  public status!: TripInvitationStatus;
  public respondedAt!: Date | null;
  public respondedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TripInvitation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'trips', key: 'id' },
      onDelete: 'CASCADE',
    },
    invitedCompanyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    respondedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'trip_invitations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['trip_id', 'invited_company_id'],
      },
    ],
  }
);
