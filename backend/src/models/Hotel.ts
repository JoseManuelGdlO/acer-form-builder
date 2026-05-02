import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HotelAttributes {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalSingleRooms: number;
  totalDoubleRooms: number;
  totalTripleRooms: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HotelCreationAttributes
  extends Optional<
    HotelAttributes,
    | 'id'
    | 'address'
    | 'city'
    | 'country'
    | 'phone'
    | 'email'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class Hotel extends Model<HotelAttributes, HotelCreationAttributes> implements HotelAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public address!: string | null;
  public city!: string | null;
  public country!: string | null;
  public phone!: string | null;
  public email!: string | null;
  public notes!: string | null;
  public totalSingleRooms!: number;
  public totalDoubleRooms!: number;
  public totalTripleRooms!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Hotel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalSingleRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalDoubleRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalTripleRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'hotels',
    timestamps: true,
    underscored: true,
  }
);
