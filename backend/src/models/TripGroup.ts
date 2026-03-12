import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripGroupAttributes {
  id: string;
  tripId: string;
  groupId: string;
  createdAt?: Date;
}

interface TripGroupCreationAttributes extends Optional<TripGroupAttributes, 'id' | 'createdAt'> {}

export class TripGroup extends Model<TripGroupAttributes, TripGroupCreationAttributes> implements TripGroupAttributes {
  public id!: string;
  public tripId!: string;
  public groupId!: string;
  public readonly createdAt!: Date;
}

TripGroup.init(
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
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'client_groups', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'trip_groups',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['trip_id', 'group_id'],
      },
    ],
  }
);
