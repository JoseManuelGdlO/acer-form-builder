import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type { ProposalBlockType } from '../quotes/proposal-snapshot';

interface QuoteProposalBlockAttributes {
  id: string;
  proposalTemplateId: string;
  blockType: ProposalBlockType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuoteProposalBlockCreationAttributes
  extends Optional<
    QuoteProposalBlockAttributes,
    'id' | 'blockType' | 'body' | 'imageUrl' | 'sortOrder' | 'createdAt' | 'updatedAt'
  > {}

export class QuoteProposalBlock
  extends Model<QuoteProposalBlockAttributes, QuoteProposalBlockCreationAttributes>
  implements QuoteProposalBlockAttributes
{
  public id!: string;
  public proposalTemplateId!: string;
  public blockType!: ProposalBlockType;
  public title!: string;
  public body!: string | null;
  public imageUrl!: string | null;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QuoteProposalBlock.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    proposalTemplateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'quote_proposal_templates', key: 'id' },
      onDelete: 'CASCADE',
    },
    blockType: {
      type: DataTypes.ENUM('section', 'itinerary', 'hotel', 'activities', 'custom'),
      allowNull: false,
      defaultValue: 'custom',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'quote_proposal_blocks',
    timestamps: true,
    underscored: true,
  }
);
