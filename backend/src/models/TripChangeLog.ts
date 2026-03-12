import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripChangeLogAttributes {
  id: string;
  tripId: string;
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt?: Date;
}

interface TripChangeLogCreationAttributes extends Optional<TripChangeLogAttributes, 'id' | 'entityType' | 'entityId' | 'fieldName' | 'oldValue' | 'newValue' | 'createdAt'> {}

export class TripChangeLog extends Model<TripChangeLogAttributes, TripChangeLogCreationAttributes> implements TripChangeLogAttributes {
  public id!: string;
  public tripId!: string;
  public userId!: string;
  public action!: string;
  public entityType!: string | null;
  public entityId!: string | null;
  public fieldName!: string | null;
  public oldValue!: string | null;
  public newValue!: string | null;
  public readonly createdAt!: Date;
}

TripChangeLog.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    fieldName: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'trip_change_log',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
