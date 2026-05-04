import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripHotelRoomAssignmentAttributes {
  id: string;
  tripHotelRoomId: string;
  participantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripHotelRoomAssignmentCreationAttributes
  extends Optional<TripHotelRoomAssignmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class TripHotelRoomAssignment
  extends Model<TripHotelRoomAssignmentAttributes, TripHotelRoomAssignmentCreationAttributes>
  implements TripHotelRoomAssignmentAttributes
{
  public id!: string;
  public tripHotelRoomId!: string;
  public participantId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TripHotelRoomAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripHotelRoomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'trip_hotel_rooms', key: 'id' },
      onDelete: 'CASCADE',
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'trip_participants', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'trip_hotel_room_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['trip_hotel_room_id', 'participant_id'],
        name: 'trip_hotel_room_assignments_room_participant_unique',
      },
    ],
  }
);
