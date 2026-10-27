import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type { QuoteServiceType } from './Quote';

interface QuoteProposalTemplateAttributes {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  serviceType: QuoteServiceType | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuoteProposalTemplateCreationAttributes
  extends Optional<
    QuoteProposalTemplateAttributes,
    | 'id'
    | 'companyId'
    | 'description'
    | 'serviceType'
    | 'isSystem'
    | 'isActive'
    | 'sortOrder'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class QuoteProposalTemplate
  extends Model<QuoteProposalTemplateAttributes, QuoteProposalTemplateCreationAttributes>
  implements QuoteProposalTemplateAttributes
{
  public id!: string;
  public companyId!: string | null;
  public name!: string;
  public description!: string | null;
  public serviceType!: QuoteServiceType | null;
  public isSystem!: boolean;
  public isActive!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QuoteProposalTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    serviceType: {
      type: DataTypes.ENUM('lodging', 'package', 'flight', 'circuit'),
      allowNull: true,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'quote_proposal_templates',
    timestamps: true,
    underscored: true,
  }
);
