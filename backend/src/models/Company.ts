import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type CompanyTheme = Record<string, string>;

interface CompanyAttributes {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  domain?: string | null;
  theme?: CompanyTheme | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes, 'id' | 'logoUrl' | 'domain' | 'theme' | 'createdAt' | 'updatedAt'> {}

export class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  public id!: string;
  public name!: string;
  public slug!: string;
  public logoUrl!: string | null;
  public domain!: string | null;
  public theme!: CompanyTheme | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    theme: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'companies',
    timestamps: true,
    underscored: true,
  }
);
