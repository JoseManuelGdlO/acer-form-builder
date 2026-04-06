import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Client } from './Client';
import { Company } from './Company';
import { Product } from './Product';

interface ClientAcquiredPackageAttributes {
  id: string;
  companyId: string;
  parentClientId: string;
  productId: string;
  beneficiaryClientId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientAcquiredPackageCreationAttributes
  extends Optional<ClientAcquiredPackageAttributes, 'id' | 'beneficiaryClientId' | 'createdAt' | 'updatedAt'> {}

export class ClientAcquiredPackage
  extends Model<ClientAcquiredPackageAttributes, ClientAcquiredPackageCreationAttributes>
  implements ClientAcquiredPackageAttributes
{
  public id!: string;
  public companyId!: string;
  public parentClientId!: string;
  public productId!: string;
  public beneficiaryClientId?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClientAcquiredPackage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    parentClientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Client, key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Product, key: 'id' },
      onDelete: 'CASCADE',
    },
    beneficiaryClientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: Client, key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'client_acquired_packages',
    timestamps: true,
    underscored: true,
  }
);
