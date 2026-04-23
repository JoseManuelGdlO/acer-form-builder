import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type CompanyTheme = Record<string, string>;

interface CompanyAttributes {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  domain?: string | null;
  theme?: CompanyTheme | null;
  advisorClientAccessMode?: 'assigned_only' | 'company_wide';
  createdAt?: Date;
  updatedAt?: Date;
}

interface CompanyCreationAttributes
  extends Optional<
    CompanyAttributes,
    'id' | 'logoUrl' | 'faviconUrl' | 'domain' | 'theme' | 'advisorClientAccessMode' | 'createdAt' | 'updatedAt'
  > {}

export class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  public id!: string;
  public name!: string;
  public slug!: string;
  public logoUrl!: string | null;
  public faviconUrl!: string | null;
  public domain!: string | null;
  public theme!: CompanyTheme | null;
  public advisorClientAccessMode!: 'assigned_only' | 'company_wide';
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
    faviconUrl: {
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
    advisorClientAccessMode: {
      type: DataTypes.ENUM('assigned_only', 'company_wide'),
      allowNull: false,
      defaultValue: 'assigned_only',
    },
  },
  {
    sequelize,
    tableName: 'companies',
    timestamps: true,
    underscored: true,
  }
);
