import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type QuoteServiceType = 'lodging' | 'package' | 'flight' | 'circuit';
export type QuoteStatus = 'draft' | 'registered' | 'expired';
export type QuoteOrigin = 'system' | 'uploaded';

interface QuoteAttributes {
  id: string;
  companyId: string;
  clientId: string;
  folio: string;
  title: string;
  serviceType: QuoteServiceType;
  hotel: string | null;
  advisorName: string;
  advisorUserId: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  validUntil: string | null;
  status: QuoteStatus;
  origin: QuoteOrigin;
  notes: string | null;
  includes: string[] | null;
  excludes: string[] | null;
  terms: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuoteCreationAttributes
  extends Optional<
    QuoteAttributes,
    | 'id'
    | 'hotel'
    | 'advisorUserId'
    | 'totalAmount'
    | 'advanceAmount'
    | 'currency'
    | 'startDate'
    | 'endDate'
    | 'validUntil'
    | 'status'
    | 'origin'
    | 'notes'
    | 'includes'
    | 'excludes'
    | 'terms'
    | 'createdBy'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class Quote extends Model<QuoteAttributes, QuoteCreationAttributes> implements QuoteAttributes {
  public id!: string;
  public companyId!: string;
  public clientId!: string;
  public folio!: string;
  public title!: string;
  public serviceType!: QuoteServiceType;
  public hotel!: string | null;
  public advisorName!: string;
  public advisorUserId!: string | null;
  public totalAmount!: number | null;
  public advanceAmount!: number | null;
  public currency!: string;
  public startDate!: string | null;
  public endDate!: string | null;
  public validUntil!: string | null;
  public status!: QuoteStatus;
  public origin!: QuoteOrigin;
  public notes!: string | null;
  public includes!: string[] | null;
  public excludes!: string[] | null;
  public terms!: string | null;
  public createdBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Quote.init(
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
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
    },
    folio: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.ENUM('lodging', 'package', 'flight', 'circuit'),
      allowNull: false,
      defaultValue: 'lodging',
    },
    hotel: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    advisorName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    advisorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    advanceAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'MXN',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'registered', 'expired'),
      allowNull: false,
      defaultValue: 'draft',
    },
    origin: {
      type: DataTypes.ENUM('system', 'uploaded'),
      allowNull: false,
      defaultValue: 'system',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    includes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    excludes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'quotes',
    timestamps: true,
    underscored: true,
  }
);
