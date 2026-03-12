import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TripCompanyAttributes {
  id: string;
  tripId: string;
  companyId: string;
  createdAt?: Date;
}

interface TripCompanyCreationAttributes extends Optional<TripCompanyAttributes, 'id' | 'createdAt'> {}

export class TripCompany extends Model<TripCompanyAttributes, TripCompanyCreationAttributes> implements TripCompanyAttributes {
  public id!: string;
  public tripId!: string;
  public companyId!: string;
  public readonly createdAt!: Date;
}

TripCompany.init(
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
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'trip_companies',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['trip_id', 'company_id'],
      },
    ],
  }
);
