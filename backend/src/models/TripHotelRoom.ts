import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TripHotelRoomType = 'single' | 'double' | 'triple';

interface TripHotelRoomAttributes {
  id: string;
  tripHotelId: string;
  roomType: TripHotelRoomType;
  label: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripHotelRoomCreationAttributes
  extends Optional<TripHotelRoomAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class TripHotelRoom
  extends Model<TripHotelRoomAttributes, TripHotelRoomCreationAttributes>
  implements TripHotelRoomAttributes
{
  public id!: string;
  public tripHotelId!: string;
  public roomType!: TripHotelRoomType;
  public label!: string;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TripHotelRoom.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripHotelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'trip_hotels', key: 'id' },
      onDelete: 'CASCADE',
    },
    roomType: {
      type: DataTypes.ENUM('single', 'double', 'triple'),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'trip_hotel_rooms',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['trip_hotel_id'] }],
  }
);
