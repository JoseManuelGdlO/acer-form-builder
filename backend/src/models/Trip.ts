import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripAttributes {
  id: string;
  companyId: string;
  title: string;
  destination?: string | null;
  departureDate: Date;
  returnDate: Date;
  notes?: string | null;
  totalSeats: number;
  busTemplateId?: string | null;
  assignedUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'id' | 'destination' | 'notes' | 'busTemplateId' | 'assignedUserId' | 'createdAt' | 'updatedAt'> {}

export class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  public id!: string;
  public companyId!: string;
  public title!: string;
  public destination!: string | null;
  public departureDate!: Date;
  public returnDate!: Date;
  public notes!: string | null;
  public totalSeats!: number;
  public busTemplateId!: string | null;
  public assignedUserId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Trip.init(
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
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    departureDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    busTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'bus_templates',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'trips',
    timestamps: true,
    underscored: true,
  }
);
