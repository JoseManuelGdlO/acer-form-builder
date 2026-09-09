import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface QuoteEventAttributes {
  id: string;
  companyId: string;
  quoteId: string;
  label: string;
  createdAt?: Date;
}

interface QuoteEventCreationAttributes
  extends Optional<QuoteEventAttributes, 'id' | 'createdAt'> {}

export class QuoteEvent
  extends Model<QuoteEventAttributes, QuoteEventCreationAttributes>
  implements QuoteEventAttributes
{
  public id!: string;
  public companyId!: string;
  public quoteId!: string;
  public label!: string;
  public readonly createdAt!: Date;
}

QuoteEvent.init(
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
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'quotes', key: 'id' },
      onDelete: 'CASCADE',
    },
    label: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'quote_events',
    timestamps: true,
    createdAt: true,
    updatedAt: false,
    underscored: true,
  }
);
