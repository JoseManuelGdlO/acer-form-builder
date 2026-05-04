import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripParticipantAttributes {
  id: string;
  tripId: string;
  clientId: string | null;
  staffMemberId: string | null;
  participantType: 'client' | 'companion' | 'staff';
  name: string | null;
  phone: string | null;
  role: string | null;
  pickupLocation: string | null;
  createdAt?: Date;
}

interface TripParticipantCreationAttributes
  extends Optional<TripParticipantAttributes, 'id' | 'createdAt' | 'pickupLocation'> {}

export class TripParticipant extends Model<TripParticipantAttributes, TripParticipantCreationAttributes> implements TripParticipantAttributes {
  public id!: string;
  public tripId!: string;
  public clientId!: string | null;
  public staffMemberId!: string | null;
  public participantType!: 'client' | 'companion' | 'staff';
  public name!: string | null;
  public phone!: string | null;
  public role!: string | null;
  public pickupLocation!: string | null;
  public readonly createdAt!: Date;
}

TripParticipant.init(
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
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
    },
    staffMemberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'staff_members', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    participantType: {
      type: DataTypes.ENUM('client', 'companion', 'staff'),
      allowNull: false,
      defaultValue: 'client',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pickupLocation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pickup_location',
    },
  },
  {
    sequelize,
    tableName: 'trip_participants',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['trip_id', 'client_id'],
      },
      {
        unique: true,
        fields: ['trip_id', 'staff_member_id'],
        name: 'trip_participants_trip_staff_member_unique',
      },
    ],
    validate: {
      participantConsistency(this: TripParticipant) {
        if (this.participantType === 'client' && !this.clientId) {
          throw new Error('client participant requires clientId');
        }
        if (this.participantType === 'companion' && !this.name?.trim()) {
          throw new Error('companion participant requires name');
        }
        if (this.participantType === 'staff' && !this.staffMemberId) {
          throw new Error('staff participant requires staffMemberId');
        }
      },
    },
  }
);
