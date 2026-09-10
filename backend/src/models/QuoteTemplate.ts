import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface QuoteTemplateAttributes {
  id: string;
  companyId: string;
  companyName: string;
  contact: string;
  title: string;
  footer: string;
  headerColor: string;
  accentColor: string;
  showLogo: boolean;
  includes: string;
  excludes: string;
  terms: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuoteTemplateCreationAttributes
  extends Optional<
    QuoteTemplateAttributes,
    'id' | 'contact' | 'showLogo' | 'headerColor' | 'accentColor' | 'createdAt' | 'updatedAt'
  > {}

export class QuoteTemplate
  extends Model<QuoteTemplateAttributes, QuoteTemplateCreationAttributes>
  implements QuoteTemplateAttributes
{
  public id!: string;
  public companyId!: string;
  public companyName!: string;
  public contact!: string;
  public title!: string;
  public footer!: string;
  public headerColor!: string;
  public accentColor!: string;
  public showLogo!: boolean;
  public includes!: string;
  public excludes!: string;
  public terms!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QuoteTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    footer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    headerColor: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: '#1379BE',
    },
    accentColor: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: '#D51E26',
    },
    showLogo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    includes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    excludes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'quote_templates',
    timestamps: true,
    underscored: true,
  }
);
