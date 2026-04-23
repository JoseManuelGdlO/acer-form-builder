import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripSeatAssignmentAttributes {
  id: string;
  tripId: string;
  clientId: string | null;
  participantId: string | null;
  seatNumber: number | null;
  seatId: string | null;
  createdAt?: Date;
}

interface TripSeatAssignmentCreationAttributes extends Optional<TripSeatAssignmentAttributes, 'id' | 'createdAt'> {}

export class TripSeatAssignment extends Model<TripSeatAssignmentAttributes, TripSeatAssignmentCreationAttributes> implements TripSeatAssignmentAttributes {
  public id!: string;
  public tripId!: string;
  public clientId!: string | null;
  public participantId!: string | null;
  public seatNumber!: number | null;
  public seatId!: string | null;
  public readonly createdAt!: Date;
}

TripSeatAssignment.init(
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
    participantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'trip_participants', key: 'id' },
      onDelete: 'CASCADE',
    },
    seatNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    seatId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'trip_seat_assignments',
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
        fields: ['trip_id', 'participant_id'],
        name: 'trip_seat_assignments_trip_participant_unique',
      },
      {
        unique: true,
        fields: ['trip_id', 'seat_number'],
        name: 'trip_seat_assignments_trip_seat_unique',
      },
    ],
  }
);
