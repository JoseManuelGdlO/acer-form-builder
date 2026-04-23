import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripParticipantAttributes {
  id: string;
  tripId: string;
  clientId: string | null;
  participantType: 'client' | 'companion';
  name: string | null;
  phone: string | null;
  createdAt?: Date;
}

interface TripParticipantCreationAttributes extends Optional<TripParticipantAttributes, 'id' | 'createdAt'> {}

export class TripParticipant extends Model<TripParticipantAttributes, TripParticipantCreationAttributes> implements TripParticipantAttributes {
  public id!: string;
  public tripId!: string;
  public clientId!: string | null;
  public participantType!: 'client' | 'companion';
  public name!: string | null;
  public phone!: string | null;
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
    participantType: {
      type: DataTypes.ENUM('client', 'companion'),
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
    ],
    validate: {
      participantConsistency(this: TripParticipant) {
        if (this.participantType === 'client' && !this.clientId) {
          throw new Error('client participant requires clientId');
        }
        if (this.participantType === 'companion' && !this.name?.trim()) {
          throw new Error('companion participant requires name');
        }
      },
    },
  }
);
