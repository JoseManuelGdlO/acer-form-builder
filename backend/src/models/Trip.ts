import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripAttributes {
  id: string;
  companyId: string;
  title: string;
  destination?: string | null;
  departureDate: Date | string;
  returnDate: Date | string;
  isVisaTrip: boolean;
  casDepartureDate?: string | null;
  casReturnDate?: string | null;
  consulateDepartureDate?: string | null;
  consulateReturnDate?: string | null;
  notes?: string | null;
  totalSeats: number;
  busTemplateId?: string | null;
  assignedUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripCreationAttributes extends Optional<
  TripAttributes,
  | 'id'
  | 'destination'
  | 'notes'
  | 'busTemplateId'
  | 'assignedUserId'
  | 'isVisaTrip'
  | 'casDepartureDate'
  | 'casReturnDate'
  | 'consulateDepartureDate'
  | 'consulateReturnDate'
  | 'createdAt'
  | 'updatedAt'
> {}

export class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  public id!: string;
  public companyId!: string;
  public title!: string;
  public destination!: string | null;
  public departureDate!: Date | string;
  public returnDate!: Date | string;
  public isVisaTrip!: boolean;
  public casDepartureDate!: string | null;
  public casReturnDate!: string | null;
  public consulateDepartureDate!: string | null;
  public consulateReturnDate!: string | null;
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
    isVisaTrip: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_visa_trip',
    },
    casDepartureDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'cas_departure_date',
    },
    casReturnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'cas_return_date',
    },
    consulateDepartureDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'consulate_departure_date',
    },
    consulateReturnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'consulate_return_date',
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
