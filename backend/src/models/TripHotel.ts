import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripHotelAttributes {
  id: string;
  tripId: string;
  hotelId: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  reservedSingles: number;
  reservedDoubles: number;
  reservedTriples: number;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripHotelCreationAttributes
  extends Optional<TripHotelAttributes, 'id' | 'notes' | 'createdAt' | 'updatedAt'> {}

export class TripHotel extends Model<TripHotelAttributes, TripHotelCreationAttributes> implements TripHotelAttributes {
  public id!: string;
  public tripId!: string;
  public hotelId!: string;
  public checkInDate!: Date | string;
  public checkOutDate!: Date | string;
  public reservedSingles!: number;
  public reservedDoubles!: number;
  public reservedTriples!: number;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TripHotel.init(
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
    hotelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'hotels', key: 'id' },
      onDelete: 'CASCADE',
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reservedSingles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reservedDoubles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reservedTriples: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'trip_hotels',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['trip_id'] }, { fields: ['hotel_id'] }],
  }
);
