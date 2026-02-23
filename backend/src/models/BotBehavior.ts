import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BotBehaviorAttributes {
  id: string;
  companyId: string;
  name: string;
  greeting: string;
  personality: string;
  tone: 'formal' | 'friendly' | 'professional';
  fallbackMessage: string;
  responseDelay: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BotBehaviorCreationAttributes extends Optional<BotBehaviorAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class BotBehavior extends Model<BotBehaviorAttributes, BotBehaviorCreationAttributes> implements BotBehaviorAttributes {
  public id!: string;
  public companyId!: string;
  public name!: string;
  public greeting!: string;
  public personality!: string;
  public tone!: 'formal' | 'friendly' | 'professional';
  public fallbackMessage!: string;
  public responseDelay!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BotBehavior.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Asistente Saru',
    },
    greeting: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    personality: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tone: {
      type: DataTypes.ENUM('formal', 'friendly', 'professional'),
      defaultValue: 'professional',
      allowNull: false,
    },
    fallbackMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responseDelay: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'bot_behavior',
    timestamps: true,
    underscored: true,
  }
);
